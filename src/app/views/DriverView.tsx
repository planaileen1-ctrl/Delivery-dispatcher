"use client";

import { useState } from "react";
import { LogOut, MapPin, Package, AlertTriangle } from "lucide-react";

import SignaturePad from "../components/SignaturePad";
import DriverWorkflow from "../components/DriverWorkflow";

export default function DriverView({
  user,
  orders,
  allOrders,
  allPumps,
  myCustodyPumps,
  isBroadSearch,
  onLogout,
}: any) {
  const [tab, setTab] = useState<"market" | "history">("market");

  const activeOrder = allOrders.find(
    (o: any) =>
      o.claimedBy === user.id &&
      o.status !== "delivered" &&
      o.status !== "cancelled"
  );

  if (activeOrder) {
    return <DriverWorkflow order={activeOrder} allPumps={allPumps} user={user} />;
  }

  const available = orders.filter((o: any) => o.status === "ready");
  const history = allOrders.filter(
    (o: any) => o.claimedBy === user.id && o.status === "delivered"
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="p-8 pt-12 bg-white border-b border-slate-100 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black italic text-slate-900 uppercase">
            {user.city}, {user.state}
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <MapPin className="w-3 h-3 text-indigo-500" />
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
              {isBroadSearch ? `Showing all in ${user.state}` : "Local Orders"}
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="p-4 bg-slate-100 rounded-2xl text-slate-500"
        >
          <LogOut />
        </button>
      </header>

      {myCustodyPumps?.length > 0 && (
        <div className="mx-6 mt-4 bg-red-500 p-4 rounded-2xl text-white shadow-lg animate-pulse">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-black text-xs uppercase tracking-widest">
              RETURN REQUIRED
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {myCustodyPumps.map((p: any) => (
              <span
                key={p.id}
                className="text-[9px] bg-white text-red-600 px-2 py-1 rounded font-bold"
              >
                {p.code}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="px-6 pt-6 flex gap-2">
        <button
          onClick={() => setTab("market")}
          className={`flex-1 py-3 rounded-xl font-black text-xs uppercase ${
            tab === "market"
              ? "bg-slate-900 text-white shadow-lg"
              : "bg-white text-slate-400"
          }`}
        >
          Market
        </button>
        <button
          onClick={() => setTab("history")}
          className={`flex-1 py-3 rounded-xl font-black text-xs uppercase ${
            tab === "history"
              ? "bg-slate-900 text-white shadow-lg"
              : "bg-white text-slate-400"
          }`}
        >
          History
        </button>
      </div>

      <div className="p-6 space-y-4 flex-1 overflow-y-auto pb-20">
        {tab === "market" ? (
          available.length === 0 ? (
            <div className="text-center py-20 opacity-30">
              <Package className="w-16 h-16 mx-auto mb-2" />
              <p className="font-black text-xs uppercase">
                No orders found near {user.city}
              </p>
            </div>
          ) : (
            available.map((o: any) => (
              <div
                key={o.id}
                className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100"
              >
                <h3 className="text-xl font-black text-slate-800 mb-1">
                  {o.clientName}
                </h3>
                <p className="text-xs text-slate-400">{o.address}</p>
              </div>
            ))
          )
        ) : (
          history.map((o: any) => (
            <div
              key={o.id}
              className="bg-white p-5 rounded-[2rem] border border-slate-100 opacity-70"
            >
              <p className="font-bold text-slate-800">{o.clientName}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
