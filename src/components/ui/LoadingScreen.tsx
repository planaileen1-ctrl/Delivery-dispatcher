"use client";

import { Loader2 } from "lucide-react";

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center text-white p-8">
      <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
      <p className="font-black uppercase text-[10px] tracking-widest opacity-40">
        System Loading...
      </p>
    </div>
  );
}
