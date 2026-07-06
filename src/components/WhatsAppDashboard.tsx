import React, { useState, useEffect } from "react";
import { 
  Phone, Shield, RefreshCw, Power, CheckCircle, 
  AlertCircle, Check, HelpCircle, ArrowUpRight, MessageSquare, Link
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

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/whatsapp/status");
      const data = await res.json();
      setConnection(data);
    } catch (e) {
      console.error("[WhatsApp REST] Poll status failed:", e);
    }
  };

  useEffect(() => {
    fetchStatus();
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

  return (
    <div className="min-h-screen bg-[#f9f6f0] flex flex-col items-center justify-between font-sans text-slate-800 p-4 md:p-8">
      
      {/* Main Container Core */}
      <div className="w-full max-w-4xl bg-white rounded-[32px] border border-slate-200/80 shadow-md p-6 md:p-12 relative overflow-hidden flex-1 flex flex-col justify-center">
        
        {/* Absolute positioned manual sync check */}
        <button
          onClick={() => setRefreshes(r => r + 1)}
          aria-label="Refresh status"
          className="absolute top-6 right-6 p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl border border-slate-200/50 transition-all cursor-pointer z-10"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
        
        <AnimatePresence mode="wait">
          {connection.status === "Connected" ? (
            /* AUTHENTICATED SUCCESS VIEW */
            <motion.div 
              key="connected-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center text-center space-y-6 py-8"
            >
              {/* Success badge */}
              <div className="relative">
                <div className="p-8 bg-emerald-50 text-emerald-600 rounded-[32px] inline-block border border-emerald-100 shadow-md">
                  <CheckCircle size={64} className="animate-pulse" />
                </div>
                <span className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-full border-4 border-white">
                  <Check size={16} />
                </span>
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-widest rounded-full">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  ✅ WhatsApp Connected
                </div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">WhatsApp Connected Successfully</h3>
                <p className="text-slate-500 text-xs max-w-md mx-auto leading-relaxed font-semibold">
                  The Baileys secure background service has paired your mobile number. Real-time notifications, dues, homework, and certificates will stream automatically.
                </p>
              </div>

              {/* Connected Phone signature panel */}
              <div className="w-full max-w-md bg-slate-50 border border-slate-100 rounded-2xl p-5 grid grid-cols-2 gap-4 text-left">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Connected Number</span>
                  <div className="flex items-center gap-2 text-slate-800">
                    <Phone className="text-emerald-500 shrink-0" size={16} />
                    <p className="text-xs font-black tracking-tight">{connection.phoneNumber || "Unknown Phone"}</p>
                  </div>
                </div>
                <div className="space-y-1 border-l border-slate-200 pl-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Connected Time</span>
                  <div className="flex items-center gap-2 text-slate-800">
                    <Shield className="text-indigo-500 shrink-0" size={16} />
                    <p className="text-[11px] font-bold text-slate-500">
                      {connection.lastSync ? new Date(connection.lastSync).toLocaleString() : "Just now"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleDisconnect}
                  className="px-6 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-2xl font-extrabold uppercase text-[11px] tracking-wider border border-rose-200/60 transition-all cursor-pointer shadow-sm"
                >
                  Disconnect WhatsApp
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
              className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center"
            >
              {/* Left Column: Authentic instructions with circled numbers */}
              <div className="md:col-span-7 space-y-6 text-left">
                <div className="space-y-2">
                  <h2 className="text-3xl font-normal text-slate-700 tracking-tight font-sans">Scan QR Code to Connect WhatsApp</h2>
                  <p className="text-slate-400 text-xs">Authorize standard web pairing to stream ERP events seamlessly.</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-7 h-7 bg-slate-100 text-slate-600 font-bold flex items-center justify-center rounded-full text-xs shrink-0 mt-0.5 border border-slate-200">
                      1
                    </div>
                    <p className="text-slate-600 text-sm font-medium pt-1">
                      Open <strong className="text-slate-800 font-extrabold">WhatsApp</strong> on your phone.
                    </p>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-7 h-7 bg-slate-100 text-slate-600 font-bold flex items-center justify-center rounded-full text-xs shrink-0 mt-0.5 border border-slate-200">
                      2
                    </div>
                    <p className="text-slate-600 text-sm font-medium pt-1">
                      Go to <strong className="text-slate-800 font-extrabold">Settings</strong> or <strong className="text-slate-800">Linked Devices</strong>.
                    </p>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-7 h-7 bg-slate-100 text-slate-600 font-bold flex items-center justify-center rounded-full text-xs shrink-0 mt-0.5 border border-slate-200">
                      3
                    </div>
                    <p className="text-slate-600 text-sm font-medium pt-1">
                      Tap <strong className="text-[#25D366] font-extrabold">Link a Device</strong>.
                    </p>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-7 h-7 bg-slate-100 text-slate-600 font-bold flex items-center justify-center rounded-full text-xs shrink-0 mt-0.5 border border-slate-200">
                      4
                    </div>
                    <p className="text-slate-600 text-sm font-medium pt-1">
                      Scan the QR code displayed on this page.
                    </p>
                  </div>
                </div>

                {/* Connection Status Panel */}
                <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2 mt-2 text-left">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Connection Status</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                      connection.status === "Connecting" ? "bg-sky-100 text-sky-800 animate-pulse" :
                      connection.status === "Waiting for QR" ? "bg-amber-100 text-amber-800" :
                      "bg-slate-100 text-slate-500"
                    }`}>
                      {connection.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Phone Number</span>
                    <span className="font-mono text-slate-600">{connection.phoneNumber || "Not Paired"}</span>
                  </div>
                </div>

                {/* stay logged in & support link */}
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
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-2 text-center p-4">
                      <Power size={36} className="text-slate-300" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gateway Standby</p>
                      <button 
                        onClick={handleConnect}
                        className="mt-3 px-5 py-2.5 bg-[#25D366] hover:bg-[#1fbc55] text-white text-[11px] font-bold uppercase rounded-xl tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                      >
                        <Link size={13} />
                        Connect WhatsApp
                      </button>
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
