"use client";

import { useState } from "react";
import { Truck, ArrowRight, Plus, ShieldCheck } from "lucide-react";

interface Props {
  onLogin: () => void;
  onRegister: () => void;
  onAdmin: () => void;
}

export default function SelectionView({
  onLogin,
  onRegister,
  onAdmin,
}: Props) {
  const [showAdmin, setShowAdmin] = useState(false);
  const [pin, setPin] = useState("");

  const handleAdminPin = () => {
    if (pin === "1844") {
      setPin("");
      setShowAdmin(false);
      onAdmin();
    } else {
      alert("Invalid administrator PIN");
      setPin("");
    }
  };

  return (
    <div className="h-screen bg-[#0f172a] flex flex-col items-center justify-center p-8 text-white text-center">
      <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
        <Truck size={40} className="text-[#0f172a]" />
      </div>

      <h1 className="text-3xl font-black italic uppercase mb-1">
        Dispatcher Pro
      </h1>
      <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-12">
        Industrial Grade Logistics
      </p>

      <div className="w-full max-w-xs space-y-4">
        <button
          onClick={onLogin}
          className="w-full bg-white text-[#0f172a] py-5 rounded-3xl font-black uppercase text-xs flex items-center justify-between px-8 shadow-xl"
        >
          <span>Portal Access</span>
          <ArrowRight size={18} className="text-emerald-600" />
        </button>

        <button
          onClick={onRegister}
          className="w-full bg-white/5 border border-white/10 py-5 rounded-3xl font-black uppercase text-xs flex items-center justify-between px-8"
        >
          <span>Create Account</span>
          <Plus size={18} className="text-emerald-400" />
        </button>
      </div>

      {/* 🔐 ADMINISTRATOR ACCESS (RESTAURADO) */}
      <div className="mt-10 w-full max-w-xs">
        {!showAdmin ? (
          <button
            onClick={() => setShowAdmin(true)}
            className="w-full flex items-center justify-center gap-2 text-[10px] uppercase font-black text-slate-400 hover:text-emerald-400 transition"
          >
            <ShieldCheck size={14} />
            Administrator / License Access
          </button>
        ) : (
          <div className="mt-4 flex gap-2">
            <input
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="flex-1 bg-white/10 p-3 rounded-xl text-center font-black tracking-widest outline-none"
              placeholder="PIN"
            />
            <button
              onClick={handleAdminPin}
              className="bg-emerald-500 text-[#0f172a] px-4 rounded-xl font-black text-xs"
            >
              ENTER
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
