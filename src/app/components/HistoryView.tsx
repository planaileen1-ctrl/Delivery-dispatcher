"use client";

import { AlertTriangle, ArrowLeftRight } from "lucide-react";

export default function HistoryView({ orders, allPumps, onBack }: any) {
  const history = orders
    .filter((o: any) => o.status === "delivered" || o.status === "cancelled")
    .sort((a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="p-6 flex justify-between items-center bg-white border-b">
        <h2 className="text-xl font-black italic">HISTORY LOG</h2>
        <button onClick={onBack} className="bg-slate-100 p-2 rounded-xl text-xs">
          Back
        </button>
      </div>

      <div className="p-4 space-y-4">
        {history.map((o: any) => (
          <div key={o.id} className="bg-white p-5 rounded-[2rem] border">
            <span className="text-[10px] font-black text-indigo-600">
              #{o.orderCode}
            </span>
            <h4 className="font-bold">{o.clientName}</h4>

            {o.failedReturns?.length > 0 && (
              <div className="bg-red-50 p-3 rounded-xl mt-2">
                <p className="text-xs font-black text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> NOT RETURNED
                </p>
              </div>
            )}

            {o.driverReturnedPumps?.length > 0 && (
              <div className="bg-blue-50 p-3 rounded-xl mt-2">
                <p className="text-xs font-black text-blue-600 flex items-center gap-1">
                  <ArrowLeftRight className="w-4 h-4" /> Returned
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
