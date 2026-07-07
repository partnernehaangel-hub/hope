import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";
import pino from "pino";
import path from "path";
import fs from "fs";

console.log("Starting test...");
async function testInit() {
  const authPath = path.join(process.cwd(), ".baileys_auth_test");
  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log("Version fetched:", version);
  
  const sock = makeWASocket.default ? makeWASocket.default({
    version,
    printQRInTerminal: false,
    auth: state,
    logger: pino({ level: "silent" }),
    browser: ["School ERP", "Chrome", "1.0.0"]
  }) : makeWASocket({
    version,
    printQRInTerminal: false,
    auth: state,
    logger: pino({ level: "silent" }),
    browser: ["School ERP", "Chrome", "1.0.0"]
  });

  console.log("Socket made successfully!");
  
  sock.ev.on("connection.update", (update) => {
    console.log("Connection update:", update);
    process.exit(0);
  });
}

testInit().catch(e => {
  console.error("Test init failed:", e);
  process.exit(1);
});
