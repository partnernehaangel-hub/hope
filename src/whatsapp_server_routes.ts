import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// Initialize Supabase Client for the server side
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

export const whatsappRouter = Router();

// Connection status cache
let connectionState = {
  status: "Disconnected", // "Waiting for QR" | "QR Generated" | "Connecting" | "Connected" | "Disconnected" | "Session Expired"
  qrCode: "",
  phoneNumber: "",
  lastSync: new Date().toISOString(),
  mode: "Real", // "Simulator" | "Real"
  error: null as string | null
};

// Log templates or campaigns
let whatsappClient: any = null;

/**
 * PERSISTENT LOGIN MECHANISM EXPLAINED:
 * 
 * To prevent scanning the QR code every time the application starts or the browser is refreshed:
 * 1. We use whatsapp-web.js's native `LocalAuth` session strategy.
 * 2. The `LocalAuth` client stores session metadata, cookies, and local tokens in a dedicated file directory: `.wwebjs_auth/session-school-erp-session`.
 * 3. On application server startup, `initRealWhatsApp()` is fired automatically.
 * 4. The `LocalAuth` constructor automatically detects the previously stored files inside `.wwebjs_auth/`.
 * 5. Instead of generating a new QR Code event, whatsapp-web.js reuse the saved authentication tokens to recreate the session.
 * 6. The "ready" event fires instantly if the session is still valid.
 * 7. If the session has been invalidated (e.g. logged out from mobile phone), "auth_failure" is triggered,
 *    updating state to "Session Expired" and prompting a renewed QR scan.
 */
async function initRealWhatsApp(forceReal: boolean = true) {
  if (!forceReal && process.env.WHATSAPP_REAL_MODE !== "true") {
    console.log("[WhatsApp] Running in Sandbox/Simulator Mode specified by WHATSAPP_REAL_MODE.");
    return false;
  }

  try {
    console.log("[WhatsApp] Attempting to load whatsapp-web.js...");
    // @ts-ignore
    const { Client, LocalAuth } = await import("whatsapp-web.js");
    
    // Configured for running inside Linux/Docker with --no-sandbox to bypass chromium restrictions
    whatsappClient = new Client({
      authStrategy: new LocalAuth({
        clientId: "school-erp-session"
      }),
      puppeteer: {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu"
        ]
      }
    });

    connectionState.mode = "Real";
    connectionState.status = "Connecting";

    whatsappClient.on("qr", (qr: string) => {
      console.log("[WhatsApp] QR Code received:", qr);
      connectionState.status = "QR Generated";
      connectionState.qrCode = qr;
      connectionState.error = null;
      updateDBSessionStatus("QR Generated", "", qr);
    });

    whatsappClient.on("ready", () => {
      const phone = whatsappClient.info.wid.user;
      console.log("[WhatsApp] Client is ready. Logged in phone:", phone);
      connectionState.status = "Connected";
      connectionState.phoneNumber = phone;
      connectionState.qrCode = "";
      connectionState.lastSync = new Date().toISOString();
      connectionState.error = null;
      updateDBSessionStatus("Connected", phone, "");
    });

    whatsappClient.on("auth_failure", (msg: string) => {
      console.error("[WhatsApp] Authentication Failure:", msg);
      connectionState.status = "Session Expired";
      connectionState.error = `Authentication session has expired: ${msg}`;
      updateDBSessionStatus("Session Expired", "", "", msg);
    });

    whatsappClient.on("disconnected", (reason: any) => {
      console.warn("[WhatsApp] Client disconnected:", reason);
      connectionState.status = "Disconnected";
      connectionState.qrCode = "";
      updateDBSessionStatus("Disconnected", "", "", `Wiped session or logged out: ${reason}`);
    });

    connectionState.status = "Connecting";
    await whatsappClient.initialize();
    return true;
  } catch (err: any) {
    console.error("[WhatsApp] Failed to launch real whatsapp-web.js: Running fallback emulator.", err.message);
    connectionState.mode = "Simulator";
    connectionState.status = "Disconnected";
    connectionState.error = `Library initialization error: ${err.message}. Defaulting to Simulator.`;
    return false;
  }
}

// Update state on DB if Supabase is connected
async function updateDBSessionStatus(status: string, phone: string, qr: string, errorMsg?: string) {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from("whatsapp_sessions")
      .upsert({
        session_name: "default",
        status: status,
        phone_number: phone,
        last_sync: new Date().toISOString()
      }, { onConflict: "session_name" });
    if (error) console.error("[WhatsApp DB] Error updating session info:", error.message);
  } catch (err) {
    console.error(err);
  }
}

// Log outgoing message to Database
async function logMessageToDB(recipientName: string, num: string, type: string, content: string, msgType: string, status: string, error?: string) {
  if (!supabase) return;
  try {
    await supabase.from("whatsapp_message_logs").insert([{
      recipient_name: recipientName,
      recipient_number: num,
      recipient_type: type,
      message_content: content,
      message_type: msgType,
      status: status,
      error_message: error || null
    }]);
  } catch (err) {
    console.error("[WhatsApp DB] Error writing message log:", err);
  }
}

// Initialize on server boot if mode is set
setTimeout(() => {
  initRealWhatsApp().catch(e => console.error("Real WhatsApp launch failed:", e));
}, 1000);

// Endpoints
whatsappRouter.get("/status", async (req, res) => {
  res.json(connectionState);
});

whatsappRouter.post("/connect", async (req, res) => {
  if (connectionState.status === "Connected") {
    return res.json({ success: true, message: "WhatsApp is already connected." });
  }

  if (connectionState.mode === "Real") {
    if (!whatsappClient) {
      await initRealWhatsApp();
    } else {
      try {
        await whatsappClient.initialize();
      } catch (e: any) {
        connectionState.error = e.message;
      }
    }
    return res.json({ success: true, message: "Initializing WhatsApp client session...", state: connectionState });
  } else {
    // Progressive Simulator Connection Flow: Connecting -> Waiting for QR -> QR Generated
    connectionState.status = "Connecting";
    connectionState.qrCode = "";
    connectionState.error = null;

    setTimeout(() => {
      // Step 2: Transition to Waiting for QR after 1000ms
      if (connectionState.status === "Connecting") {
        connectionState.status = "Waiting for QR";
      }
    }, 1000);

    setTimeout(() => {
      // Step 3: Transition to QR Generated after another 1200ms
      if (connectionState.status === "Waiting for QR") {
        connectionState.status = "QR Generated";
        connectionState.qrCode = "1@yK5p9R4LiSdW7vN05uAuVlYlF3s45xQcO5x...ERP_SIM_TOKEN_PXS..." + Date.now();
      }
    }, 2200);

    return res.json({ success: true, message: "Started progressive simulator session initialization.", state: connectionState });
  }
});

// Endpoint to simulate successful QR scan in sandbox mode
whatsappRouter.post("/simulate-scan", async (req, res) => {
  if (connectionState.status !== "QR Generated" && connectionState.status !== "Waiting for QR" && connectionState.status !== "ScanningQR") {
    return res.status(400).json({ error: "Client must be of state Waiting for QR or QR Generated to simulate a QR scan." });
  }

  const simulatedPhone = req.body.phone || "+91 98765 43210";
  connectionState.status = "Connected";
  connectionState.phoneNumber = simulatedPhone;
  connectionState.qrCode = "";
  connectionState.lastSync = new Date().toISOString();
  connectionState.error = null;

  await updateDBSessionStatus("Connected", simulatedPhone, "");
  res.json({ success: true, message: "Successfully paired simulated phone session!", state: connectionState });
});

whatsappRouter.post("/set-mode", async (req, res) => {
  const { mode } = req.body;
  if (mode !== "Real" && mode !== "Simulator") {
    return res.status(400).json({ error: "Invalid mode. Must be 'Real' or 'Simulator'." });
  }

  console.log(`[WhatsApp] Changing connection mode manually to: ${mode}`);
  
  if (whatsappClient) {
    try {
      await whatsappClient.destroy();
      whatsappClient = null;
    } catch (e) {
      console.error("[WhatsApp] Cleanup while changing mode failed:", e);
    }
  }

  connectionState.mode = mode;
  connectionState.status = "Disconnected";
  connectionState.qrCode = "";
  connectionState.phoneNumber = "";
  connectionState.error = null;

  if (mode === "Real") {
    initRealWhatsApp(true).catch(e => {
      console.error("[WhatsApp] Failed to init real client on manual set mode:", e);
    });
  }

  res.json({ success: true, message: `Successfully switched to ${mode} mode.`, state: connectionState });
});

whatsappRouter.post("/disconnect", async (req, res) => {
  connectionState.status = "Disconnected";
  connectionState.phoneNumber = "";
  connectionState.qrCode = "";
  connectionState.error = null;

  if (whatsappClient) {
    try {
      await whatsappClient.destroy();
      whatsappClient = null;
    } catch (e) {
      console.error(e);
    }
  }

  await updateDBSessionStatus("Disconnected", "", "");
  res.json({ success: true, message: "Disconnected successfully.", state: connectionState });
});

// Send single message
whatsappRouter.post("/send", async (req, res) => {
  const { recipientName, recipientNumber, recipientType, messageContent, messageType, attachmentUrl } = req.body;

  if (!recipientNumber) {
    return res.status(400).json({ error: "Recipient phone number is required." });
  }

  const cleanNum = recipientNumber.replace(/\D/g, "");
  const targetId = cleanNum.includes("@c.us") ? cleanNum : `${cleanNum}@c.us`;

  if (connectionState.status !== "Connected") {
    return res.status(400).json({ error: "WhatsApp is not connected. Connect first from the dashboard." });
  }

  try {
    if (connectionState.mode === "Real" && whatsappClient) {
      // Send real message using whatsapp-web.js
      if (attachmentUrl) {
        // Send with document/media attachments
        // Typically reads file URL into MessageMedia, but here we can serialize it
        // and send natively or pass standard text including external attachment link
        const textWithAttachment = `${messageContent}\n\nAttachment: ${attachmentUrl}`;
        await whatsappClient.sendMessage(targetId, textWithAttachment);
      } else {
        await whatsappClient.sendMessage(targetId, messageContent);
      }
      
      await logMessageToDB(recipientName || "Direct Contact", cleanNum, recipientType || "other", messageContent, messageType || "text", "delivered");
      return res.json({ success: true, message: "Message sent successfully!", provider: "Real Web WhatsApp" });
    } else {
      // Simulator mode sends mock success and triggers webhooks
      const statusOptions = ["sent", "delivered", "failed"];
      const randomStatus = Math.random() > 0.05 ? "delivered" : "failed"; // 95% deliverability rate
      const errorMsg = randomStatus === "failed" ? "Network routing delay or invalid contact format" : undefined;

      await logMessageToDB(recipientName || "Direct Contact", cleanNum, recipientType || "other", messageContent, messageType || "text", randomStatus, errorMsg);
      
      return res.json({ 
        success: true, 
        message: `[Simulated] Message sent successfully to ${recipientName || cleanNum}!`, 
        status: randomStatus,
        error: errorMsg,
        provider: "Virtual ERP Gateway"
      });
    }
  } catch (err: any) {
    await logMessageToDB(recipientName || "Direct Contact", cleanNum, recipientType || "other", messageContent, messageType || "text", "failed", err.message);
    res.status(500).json({ error: `Message delivery failed: ${err.message}` });
  }
});

// Bulk Messaging
whatsappRouter.post("/bulk", async (req, res) => {
  const { recipients, templateBody, campaignName, messageType } = req.body;

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: "Recipients array is required." });
  }

  if (connectionState.status !== "Connected") {
    return res.status(400).json({ error: "WhatsApp is not connected." });
  }

  let successCount = 0;
  let failCount = 0;

  // Insert standard campaign tracking record
  let campaignId = "";
  if (supabase) {
    try {
      const { data: campaign } = await supabase.from("whatsapp_campaigns").insert({
        name: campaignName || "Quick Campaign",
        status: "running"
      }).select().single();
      campaignId = campaign?.id || "";
    } catch (e) {
      console.error(e);
    }
  }

  // Iterate and queue or send with short throttles to simulate natural sending
  for (const item of recipients) {
    const cleanNum = item.phone.replace(/\D/g, "");
    if (!cleanNum) {
      failCount++;
      continue;
    }

    try {
      // Dynamic variables replacement
      let customMessage = templateBody
        .replace(/{name}/gi, item.name || "Recipient")
        .replace(/{class}/gi, item.className || "N/A")
        .replace(/{due}/gi, item.dueAmount || "0")
        .replace(/{date}/gi, new Date().toLocaleDateString())
        .replace(/{roll}/gi, item.rollNo || "N/A");

      if (connectionState.mode === "Real" && whatsappClient) {
        const targetId = `${cleanNum}@c.us`;
        await whatsappClient.sendMessage(targetId, customMessage);
        await logMessageToDB(item.name, cleanNum, item.role || "student", customMessage, messageType || "text", "delivered");
        successCount++;
      } else {
        // Simulated natural random send delay to show scannable live activity
        const randomStatus = Math.random() > 0.08 ? "delivered" : "failed";
        const errorMsg = randomStatus === "failed" ? "Mobile subscriber temporarily out of coverage" : undefined;
        await logMessageToDB(item.name, cleanNum, item.role || "student", customMessage, messageType || "text", randomStatus, errorMsg);
        
        if (randomStatus === "delivered") {
          successCount++;
        } else {
          failCount++;
        }
      }
    } catch (e) {
      failCount++;
    }
  }

  // Check out campaign status
  if (supabase && campaignId) {
    await supabase.from("whatsapp_campaigns").update({ status: "sent" }).eq("id", campaignId);
  }

  res.json({
    success: true,
    message: `Bulk messaging complete. Sent: ${successCount}, Failed: ${failCount}`,
    successCount,
    failCount
  });
});

// Endpoint to simulate incoming user response (useful for sandbox workflow triggers)
whatsappRouter.post("/incoming-reply", async (req, res) => {
  const { senderNumber, senderName, messageContent } = req.body;
  if (!senderNumber || !messageContent) {
    return res.status(400).json({ error: "senderNumber and messageContent required." });
  }

  const cleanNum = senderNumber.replace(/\D/g, "");

  if (supabase) {
    try {
      await supabase.from("whatsapp_incoming").insert({
        sender_number: cleanNum,
        sender_name: senderName || "Parent Contact",
        message_content: messageContent
      });

      // Simple keywords responses emulator!
      if (messageContent.toLowerCase().includes("fee")) {
        // Auto-reply context trigger
        const autoReply = `Hello ${senderName || "there"}, our automated support logs show a fee dues inquiry. To get live ledgers, tap the dashboard or reply with "1" to get the standard bank payment details. Thank you!`;
        console.log("[WhatsApp AutoResponder] Sending auto dues reminder callback.");
        
        await logMessageToDB("AutoResponder Reply", cleanNum, "parent", autoReply, "text", "delivered");
      }
    } catch (e) {
      console.error(e);
    }
  }

  res.json({ success: true, message: "Simulated response recorded successfully." });
});
