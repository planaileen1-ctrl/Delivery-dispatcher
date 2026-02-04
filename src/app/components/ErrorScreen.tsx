"use client";

import { XCircle, RefreshCw } from "lucide-react";

export default function ErrorScreen({ msg, onRetry }: any) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-8 text-center">
      <XCircle className="w-16 h-16 text-red-500 mb-4" />
      <h2 className="text-xl font-bold mb-2">Connection Error</h2>
      <p className="text-slate-400 text-sm mb-8">{msg}</p>
      <button
        onClick={onRetry}
        className="bg-indigo-600 px-6 py-3 rounded-xl font-bold flex items-center gap-2 mx-auto"
      >
        <RefreshCw className="w-4 h-4" /> Reintentar
      </button>
    </div>
  );
}
