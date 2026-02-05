"use client";

import { useMemo } from "react";
import { Order } from "@/types";

export default function HistoryView({
  orders,
  onBack,
}: {
  orders: Order[];
  onBack: () => void;
}) {
  const hist = useMemo(
    () =>
      orders
        .filter((o) => o.status === "delivered" || o.status === "cancelled")
        .sort(
          (a: any, b: any) =>
            (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
        ),
    [orders]
  );

  return (
    <div className="h-full flex flex-col">
      <header className="p-2 flex justify-between items-center border-b mb-4">
        <h2 className="text-xl font-black italic uppercase">System History</h2>
        <button
          onClick={onBack}
          className="p-2 bg-slate-100 rounded-xl text-xs font-bold"
        >
          Back
        </button>
      </header>

      <div className="flex-1 overflow-y-auto space-y-4 pb-20">
        {hist.length === 0 ? (
          <p className="text-center py-20 opacity-30 uppercase font-black text-xs">
            No history found
          </p>
        ) : (
          hist.map((o) => (
            <div
              key={o.id}
              className="bg-white p-5 rounded-3xl shadow-sm border animate-in"
            >
              <div className="flex justify-between mb-2">
                <span className="text-[10px] font-black text-indigo-600 uppercase">
                  #{o.orderCode}
                </span>
                <span
                  className={`text-[8px] px-2 py-1 rounded font-black uppercase ${
                    o.status === "delivered"
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {o.status}
                </span>
              </div>

              <h4 className="font-bold">{o.clientName}</h4>
              <p className="text-[10px] text-slate-400 mb-3">
                {o.address}
              </p>

              {o.signatureClient && (
                <div className="mt-2 border-t pt-2 text-center">
                  <p className="text-[8px] font-black text-slate-300 uppercase mb-1">
                    Receiver Signature
                  </p>
                  <img
                    src={o.signatureClient}
                    alt="Sig"
                    className="h-8 mx-auto object-contain opacity-60"
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
