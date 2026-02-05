"use client";

import { XCircle } from "lucide-react";

export default function ErrorScreen({
  msg,
  onRetry,
}: {
  msg: string;
  onRetry: () => void;
}) {
  return (
    <div className="h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-8 text-center">
      <XCircle className="w-16 h-16 text-red-500 mb-4 mx-auto" />
      <h2 className="text-xl font-bold mb-2 uppercase italic">
        Connection Error
      </h2>
      <p className="text-slate-400 text-xs mb-8 max-w-xs mx-auto opacity-60">
        {msg}
      </p>
      <button
        onClick={onRetry}
        className="bg-emerald-500 text-slate-900 px-8 py-4 rounded-3xl font-black uppercase text-xs"
      >
        Retry Connection
      </button>
    </div>
  );
}
