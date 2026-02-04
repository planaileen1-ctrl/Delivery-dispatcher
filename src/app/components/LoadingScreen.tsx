"use client";

import { Loader2 } from "lucide-react";

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
      <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
      <p className="font-black uppercase text-[10px] tracking-[0.3em] opacity-50">
        Cargando Sistema...
      </p>
    </div>
  );
}
