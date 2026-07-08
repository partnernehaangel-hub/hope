import React, { useState, useEffect } from "react";
import { 
  Phone, Shield, RefreshCw, Power, CheckCircle, 
  AlertCircle, Check, HelpCircle, ArrowUpRight, MessageSquare, Link, Sparkles
} from "lucide-react";
import QRCode from "react-qr-code";
import { motion, AnimatePresence } from "motion/react";

export const WhatsAppDashboard = ({ schoolProfile, supabase }: any) => {
  const [connection, setConnection] = useState({
    status: "Disconnected",
    qrCode: "",
    phoneNumber: "",
    lastSync: "",
    mode: "Real",
    error: null as string | null
  });
  
  const [loading, setLoading] = useState(false);
  const [refreshes, setRefreshes] = useState(0);
  const [stayLoggedIn, setStayLoggedIn] = useState(true);

  // Parent/Incoming Simulator Form States
  const [simName, setSimName] = useState("Angelina Neha");
  const [simPhone, setSimPhone] = useState("+91 98765 43210");
  const [simMessage, setSimMessage] = useState("Hi, please send me my child's outstanding school fee dues.");
  const [simulatingMsg, setSimulatingMsg] = useState(false);
  const [simFeedback, setSimFeedback] = useState("");

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/whatsapp/status");
      const data = await res.json();
      setConnection(data);
      return data;
    } catch (e) {
      // Quietly handle transient network/startup fetch failures
      console.debug("[WhatsApp REST] Poll status skipped (server starting or transient network down):", e);
      return null;
    }
  };

  useEffect(() => {
    const initAndAutoConnect = async () => {
      const current = await fetchStatus();
      if (current && current.status === "Disconnected") {
        console.log("[WhatsApp Dashboard] Auto-connecting disconnected instance...");
        fetch("/api/whatsapp/connect", { method: "POST" })
          .then(() => fetchStatus())
          .catch(e => console.error(e));
      }
    };
    initAndAutoConnect();
    const interval = setInterval(fetchStatus, 3000); // Poll status every 3 seconds
    return () => clearInterval(interval);
  }, [refreshes]);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp/connect", { method: "POST" });
      const data = await res.json();
      if (data.state) {
        setConnection(data.state);
      } else {
        await fetchStatus();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshQR = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp/reconnect", { method: "POST" });
      const data = await res.json();
      if (data.state) {
        setConnection(data.state);
      } else {
        await fetchStatus();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect WhatsApp and clear the saved session?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp/disconnect", { method: "POST" });
      const data = await res.json();
      if (data.state) {
        setConnection(data.state);
      } else {
        await fetchStatus();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchMode = async (targetMode: "Real" | "Sandbox") => {
    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp/mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: targetMode })
      });
      const data = await res.json();
      if (data.state) {
        setConnection(data.state);
      } else {
        await fetchStatus();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateScan = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp/simulate-scan", { method: "POST" });
      const data = await res.json();
      if (data.state) {
        setConnection(data.state);
      } else {
        await fetchStatus();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateIncoming = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simPhone || !simMessage) return;
    setSimulatingMsg(true);
    setSimFeedback("");
    try {
      const res = await fetch("/api/whatsapp/incoming-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderNumber: simPhone,
          senderName: simName,
          messageContent: simMessage
        })
      });
      const data = await res.json();
      setSimFeedback("Success! Simulated incoming message recorded. Auto-reply triggered if 'fee' is mentioned!");
      setTimeout(() => setSimFeedback(""), 6000);
    } catch (err) {
      console.error(err);
      setSimFeedback("Failed to simulate incoming message.");
    } finally {
      setSimulatingMsg(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f6f0] flex flex-col items-center justify-between font-sans text-slate-800 p-4 md:p-8">
      
      {/* Main Container Core */}
      <div className="w-full max-w-4xl bg-white rounded-[32px] border border-slate-200/80 shadow-md p-6 md:p-10 relative overflow-hidden flex-1 flex flex-col justify-start">
        
        {/* Absolute positioned manual sync check */}
        <button
          onClick={() => setRefreshes(r => r + 1)}
          aria-label="Refresh status"
          className="absolute top-6 right-6 p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl border border-slate-200/50 transition-all cursor-pointer z-10 animate-hover"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>

        {/* Top Branding Header */}
        <div className="mb-6 pb-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 inline-block mb-1">
              ERP Integration Hub
            </span>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              WhatsApp Communication Gateway
            </h1>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 border border-slate-200 self-start md:self-auto">
            <button
              onClick={() => handleSwitchMode("Real")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                connection.mode === "Real" 
                  ? "bg-white text-slate-800 shadow-sm border border-slate-200/50" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Real Device
            </button>
            <button
              onClick={() => handleSwitchMode("Sandbox")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                connection.mode === "Sandbox" 
                  ? "bg-emerald-600 text-white shadow-sm" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Sparkles size={12} />
              ERP Sandbox
            </button>
          </div>
        </div>

        {/* Mode Info Alert */}
        {connection.mode === "Sandbox" ? (
          <div className="mb-6 p-4 bg-amber-50/80 border border-amber-200/50 rounded-2xl flex items-start gap-3">
            <Sparkles size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-left">
              <h4 className="text-xs font-black text-amber-800 uppercase tracking-wide">Demo Sandbox Simulator Active</h4>
              <p className="text-[11px] text-amber-700/90 font-medium leading-relaxed mt-0.5">
                Standard sandboxed browsers block outbound WebSockets required for real WhatsApp pairing. Use this sandbox to instantly connect, send messages, and simulate real parent responses.
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-start gap-3">
            <Shield size={18} className="text-slate-600 shrink-0 mt-0.5" />
            <div className="text-left">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide">Real Device Mode Active</h4>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-0.5">
                The gateway is attempting to pair with a physical WhatsApp account using Baileys. Keep this dashboard open while scanning.
              </p>
            </div>
          </div>
        )}
        
        <AnimatePresence mode="wait">
          {connection.status === "Connected" ? (
            /* AUTHENTICATED SUCCESS VIEW */
            <motion.div 
              key="connected-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex flex-col items-center justify-center text-center space-y-6 py-4 flex-1"
            >
              {/* Success badge */}
              <div className="relative">
                <div className="p-6 bg-emerald-50 text-emerald-600 rounded-[32px] inline-block border border-emerald-100 shadow-md">
                  <CheckCircle size={56} className="animate-pulse" />
                </div>
                <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border-4 border-white">
                  <Check size={14} />
                </span>
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-widest rounded-full">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  {connection.mode === "Sandbox" ? "⚡ Sandbox Connected" : "✅ WhatsApp Connected"}
                </div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                  {connection.mode === "Sandbox" ? "ERP Simulator Connected" : "WhatsApp Linked Successfully"}
                </h3>
                <p className="text-slate-500 text-xs max-w-md mx-auto leading-relaxed font-semibold">
                  {connection.mode === "Sandbox" 
                    ? "The ERP Simulator has paired your mock gateway. Automated fee dues reminders, certificates, and alerts will stream to the database logs."
                    : "The Baileys background service has paired your mobile number. Real-time notifications, dues, homework, and certificates will stream automatically."
                  }
                </p>
              </div>

              {/* Connected Phone signature panel */}
              <div className="w-full max-w-lg bg-slate-50 border border-slate-100 rounded-2xl p-5 grid grid-cols-2 gap-4 text-left">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Linked Number</span>
                  <div className="flex items-center gap-2 text-slate-800">
                    <Phone className="text-emerald-500 shrink-0" size={16} />
                    <p className="text-xs font-black tracking-tight">{connection.phoneNumber || "Unknown Phone"}</p>
                  </div>
                </div>
                <div className="space-y-1 border-l border-slate-200 pl-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gateway Mode</span>
                  <div className="flex items-center gap-2 text-slate-800">
                    <Shield className="text-indigo-500 shrink-0" size={16} />
                    <p className="text-xs font-black tracking-tight">
                      {connection.mode === "Sandbox" ? "Sandbox Emulation" : "Baileys Real Socket"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sandbox Messenger Autoresponder Simulator Panel */}
              {connection.mode === "Sandbox" && (
                <div className="w-full max-w-lg border border-slate-200/80 rounded-2xl p-5 bg-emerald-50/20 text-left space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Sparkles size={16} className="text-emerald-600" />
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                      Interactive Parent Message Simulator
                    </h4>
                  </div>
                  
                  <form onSubmit={handleSimulateIncoming} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                          Sender Name
                        </label>
                        <input
                          type="text"
                          value={simName}
                          onChange={(e) => setSimName(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                          placeholder="e.g. Angelina"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                          Phone Number
                        </label>
                        <input
                          type="text"
                          value={simPhone}
                          onChange={(e) => setSimPhone(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                          placeholder="e.g. +91 9876543210"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                        Message Content
                      </label>
                      <textarea
                        rows={2}
                        value={simMessage}
                        onChange={(e) => setSimMessage(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium resize-none focus:outline-none focus:border-emerald-500"
                        placeholder="Mention 'fee' to trigger the Autoresponder!"
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={simulatingMsg}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {simulatingMsg ? "Delivering..." : "📩 Send Simulated Incoming Message"}
                    </button>
                  </form>
                  {simFeedback && (
                    <div className="p-2.5 bg-emerald-100/60 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 font-bold text-center">
                      {simFeedback}
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleDisconnect}
                  className="px-6 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-2xl font-extrabold uppercase text-[11px] tracking-wider border border-rose-200/60 transition-all cursor-pointer shadow-sm"
                >
                  Disconnect Gateway
                </button>
              </div>
            </motion.div>
          ) : (
            /* WHATSAPP WEB SCAN CLONE VIEW */
            <motion.div 
              key="auth-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center flex-1"
            >
              {/* Left Column: Authentic instructions with circled numbers */}
              <div className="md:col-span-7 space-y-6 text-left">
                <div className="space-y-1">
                  <h2 className="text-3xl font-normal text-slate-700 tracking-tight font-sans">
                    {connection.mode === "Sandbox" ? "Activate Sandbox Gateway" : "Scan QR Code to Connect"}
                  </h2>
                  <p className="text-slate-400 text-xs">
                    {connection.mode === "Sandbox" 
                      ? "Pair a simulated mock device to test automated messages instantly."
                      : "Authorize standard web pairing to stream ERP events seamlessly."
                    }
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-7 h-7 bg-slate-100 text-slate-600 font-bold flex items-center justify-center rounded-full text-xs shrink-0 mt-0.5 border border-slate-200">
                      1
                    </div>
                    <p className="text-slate-600 text-sm font-medium pt-1">
                      {connection.mode === "Sandbox" 
                        ? "Click the button in the QR card or tab above." 
                        : "Open WhatsApp on your phone."
                      }
                    </p>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-7 h-7 bg-slate-100 text-slate-600 font-bold flex items-center justify-center rounded-full text-xs shrink-0 mt-0.5 border border-slate-200">
                      2
                    </div>
                    <p className="text-slate-600 text-sm font-medium pt-1">
                      {connection.mode === "Sandbox"
                        ? "Instantly bypass real camera and Bluetooth scanning."
                        : "Go to Settings or Linked Devices."
                      }
                    </p>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-7 h-7 bg-slate-100 text-slate-600 font-bold flex items-center justify-center rounded-full text-xs shrink-0 mt-0.5 border border-slate-200">
                      3
                    </div>
                    <p className="text-slate-600 text-sm font-medium pt-1">
                      {connection.mode === "Sandbox"
                        ? "Connect standard simulated databases to record sent/received logs."
                        : "Tap Link a Device."
                      }
                    </p>
                  </div>
                </div>

                {/* One-Click WhatsApp Web Link Panel */}
                {connection.mode === "Real" && (
                  <div className="p-5 bg-emerald-50/60 border border-emerald-100 rounded-2xl space-y-3 mt-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
                        <MessageSquare size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">WhatsApp Web Integration</h4>
                        <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                          Opening <strong className="text-[#25D366]">https://web.whatsapp.com/</strong> opens standard WhatsApp Web. By scanning the QR code on this page, the software will automatically log in and authorize the ERP to send messages on your behalf.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        window.open("https://web.whatsapp.com/", "_blank");
                        handleConnect();
                      }}
                      className="w-full py-3 bg-[#25D366] hover:bg-[#1fbc55] text-white font-black text-[11px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-500/10 cursor-pointer"
                    >
                      <ArrowUpRight size={14} />
                      Open web.whatsapp.com & Link Software
                    </button>
                  </div>
                )}

                {/* Connection Status Panel */}
                <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2 text-left">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Connection Status</span>
                    <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                      connection.status === "Connecting" ? "bg-sky-100 text-sky-800 animate-pulse" :
                      connection.status === "Waiting for QR" ? "bg-amber-100 text-amber-800" :
                      "bg-slate-100 text-slate-500"
                    }`}>
                      {connection.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Active Mode</span>
                    <span className="font-bold text-slate-600 text-[10px] uppercase">{connection.mode}</span>
                  </div>
                </div>

                {/* support link */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
                  <label htmlFor="keep-logged-in" className="flex items-center gap-2 cursor-pointer select-none group">
                    <input 
                      id="keep-logged-in"
                      type="checkbox" 
                      checked={stayLoggedIn}
                      onChange={(e) => setStayLoggedIn(e.target.checked)}
                      className="rounded border-slate-300 text-[#25D366] focus:ring-[#25D366] w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-700 transition-colors">
                      Stay logged in on this browser
                    </span>
                  </label>

                  <a 
                    href="https://faq.whatsapp.com/web" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-xs font-bold text-[#00a884] hover:underline flex items-center gap-1"
                  >
                    Need help? <ArrowUpRight size={14} />
                  </a>
                </div>
              </div>

              {/* Right Column: Original QR scan container */}
              <div className="md:col-span-5 flex flex-col items-center justify-center space-y-4">
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-md relative w-full max-w-[280px] aspect-square flex items-center justify-center">
                  
                  {connection.status === "Connecting" || (connection.status === "Waiting for QR" && !connection.qrCode) ? (
                    <div className="flex flex-col items-center justify-center space-y-3 text-center px-4">
                      <div className="w-12 h-12 border-4 border-slate-100 border-t-[#25D366] rounded-full animate-spin"></div>
                      <p className="text-xs font-semibold text-slate-500 animate-pulse leading-relaxed">
                        Waiting for WhatsApp to generate QR Code...
                      </p>
                    </div>
                  ) : connection.status === "Waiting for QR" && connection.qrCode ? (
                    <div className="flex flex-col items-center justify-center w-full space-y-4">
                      {connection.mode === "Sandbox" ? (
                        /* Sandbox Mock Pairing View */
                        <div className="flex flex-col items-center justify-center space-y-3 w-full text-center">
                          <div className="w-48 h-48 bg-emerald-50 border-2 border-dashed border-emerald-200 rounded-2xl flex flex-col items-center justify-center p-3 relative">
                            <Sparkles size={36} className="text-emerald-500 animate-bounce" />
                            <p className="text-[11px] font-bold text-emerald-800 uppercase mt-2 tracking-wide">
                              Mock QR Active
                            </p>
                            <p className="text-[10px] text-slate-400 font-semibold px-2 mt-1">
                              Tap the button below to simulate pairing
                            </p>
                          </div>
                          <button 
                            onClick={handleSimulateScan}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase rounded-xl tracking-wider transition-all cursor-pointer shadow-md"
                          >
                            📱 Pair Simulated Phone
                          </button>
                        </div>
                      ) : (
                        /* Renders beautiful customized styling with centered WhatsApp mini square hook */
                        <div className="relative">
                          <QRCode 
                            value={connection.qrCode} 
                            size={210} 
                            fgColor="#111827" 
                            style={{ height: "auto", maxWidth: "100%", width: "100%" }} 
                          />
                          <div className="absolute top-[41%] left-[41%] w-[18%] h-[18%] bg-white rounded-xl shadow-lg border border-slate-100 flex items-center justify-center text-[#25D366]">
                            <MessageSquare size={18} fill="#25D366" className="text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-2 text-center p-4">
                      <Power size={36} className="text-slate-300 animate-pulse" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gateway Standby</p>
                      
                      {connection.mode === "Sandbox" ? (
                        <button 
                          onClick={handleConnect}
                          className="mt-3 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold uppercase rounded-xl tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                        >
                          <Sparkles size={13} />
                          Initialize Sandbox
                        </button>
                      ) : (
                        <button 
                          onClick={handleConnect}
                          className="mt-3 px-5 py-2.5 bg-[#25D366] hover:bg-[#1fbc55] text-white text-[11px] font-bold uppercase rounded-xl tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                        >
                          <Link size={13} />
                          Connect WhatsApp
                        </button>
                      )}
                    </div>
                  )}
                  
                </div>

                {/* Control Panel when initiating connection */}
                {(connection.status === "Connecting" || connection.status === "Waiting for QR") && (
                  <div className="flex gap-2 w-full max-w-[280px]">
                    <button
                      onClick={handleRefreshQR}
                      className="flex-1 py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-bold uppercase rounded-xl border border-slate-200 transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                    >
                      <RefreshCw size={11} />
                      Refresh QR
                    </button>
                    <button
                      onClick={handleDisconnect}
                      className="flex-1 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold uppercase rounded-xl border border-rose-200 transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                    >
                      Disconnect
                    </button>
                  </div>
                )}

                {/* Live Status indicator capsule below QR */}
                <div className="flex items-center justify-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${
                    connection.status === "Connecting" ? "bg-blue-500 animate-pulse" :
                    connection.status === "Waiting for QR" ? "bg-indigo-500 animate-pulse" :
                    connection.status === "Connected" ? "bg-emerald-500" :
                    "bg-slate-400"
                  }`} />
                  <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                    {connection.status}
                  </p>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Footer Branding */}
      <div className="w-full text-center py-6 border-t border-slate-200/50 mt-8 text-[10px] font-black uppercase tracking-widest text-slate-400 flex flex-col sm:flex-row items-center justify-center gap-2">
        <span>A product of Digital Access powered by Joshoda</span>
        <span className="hidden sm:inline">•</span>
        <a 
          href="https://whatsapp.com" 
          target="_blank" 
          rel="noreferrer"
          className="hover:text-slate-600 transition-colors flex items-center gap-0.5"
        >
          Don't have a WhatsApp account? Get started <HelpCircle size={10} />
        </a>
      </div>

    </div>
  );
};
