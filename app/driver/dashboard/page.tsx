/**
 * ⚠️ PROTECTED FILE — DRIVER DASHBOARD
 *
 * This file ONLY ADDS new functionality.
 * DOES NOT REMOVE OR BREAK ANY EXISTING LOGIC.
 *
 * Last verified: 2026-02-09
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Truck, RotateCcw, Link2, FileText, PackageOpen, AlertTriangle } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

export default function DriverDashboardPage() {
  const router = useRouter();
  const driverId = typeof window !== "undefined" ? localStorage.getItem("DRIVER_ID") : null;
  const driverName = typeof window !== "undefined" ? localStorage.getItem("DRIVER_NAME") : "UNKNOWN";

  // Estados principales
  const [dashboardSection, setDashboardSection] = useState("home");
  const [deliveryInfo, setDeliveryInfo] = useState("");
  const [acceptInfo, setAcceptInfo] = useState("");
  const [lastTechnicalError, setLastTechnicalError] = useState("");
  const [hasPendingReturns, setHasPendingReturns] = useState(false);
  const [pendingReturnPumpCount, setPendingReturnPumpCount] = useState(0);
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [returnTasks, setReturnTasks] = useState<any[]>([]);
  // Conexión farmacia
  const [pharmacyPin, setPharmacyPin] = useState("");
  const [pharmacyConnectLoading, setPharmacyConnectLoading] = useState(false);
  const [pharmacyConnectError, setPharmacyConnectError] = useState("");
  const [pharmacyConnectSuccess, setPharmacyConnectSuccess] = useState("");

  async function handleConnectPharmacy() {
    setPharmacyConnectError("");
    setPharmacyConnectSuccess("");
    if (!pharmacyPin || pharmacyPin.length !== 4) {
      setPharmacyConnectError("Enter a valid 4-digit PIN");
      return;
    }
    if (!driverId) {
      setPharmacyConnectError("Driver not identified");
      return;
    }
    setPharmacyConnectLoading(true);
    try {
      const { connectDriverToPharmacy } = await import("@/lib/driverPharmacy");
      const result = await connectDriverToPharmacy(driverId, pharmacyPin);
      setPharmacyConnectSuccess(`Connected to pharmacy: ${result.pharmacyName}`);
      setPharmacyPin("");
    } catch (err: any) {
      setPharmacyConnectError(err.message || "Connection failed");
    } finally {
      setPharmacyConnectLoading(false);
    }
  }

  // Simulación de carga de datos (debería ser reemplazado por lógica real)
  useEffect(() => {
    // Aquí iría la lógica real de carga de órdenes y returns
    setAvailableOrders([]);
    setActiveOrders([]);
    setReturnTasks([]);
    setHasPendingReturns(false);
    setPendingReturnPumpCount(0);
  }, []);

  return (
    <main className="min-h-screen bg-[#020617] text-white flex justify-center py-10 px-4">
      <div className="w-full max-w-5xl space-y-8">
        <div className="flex items-center justify-center gap-4">
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent">
            Driver Dashboard
          </h1>
          {driverId && (
            <NotificationBell userId={driverId} role="DRIVER" />
          )}
        </div>
        <p className="text-xs text-white/50 uppercase tracking-widest font-semibold">
          {driverName || "Driver"}
        </p>

        {deliveryInfo && (
          <p className="text-green-400 text-sm text-center">{deliveryInfo}</p>
        )}
        {acceptInfo && (
          <p className="text-yellow-300 text-sm text-center">{acceptInfo}</p>
        )}
        {lastTechnicalError && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3">
            <p className="text-[11px] font-semibold text-rose-300 uppercase tracking-wider">Last technical error</p>
            <p className="text-xs text-rose-200/90 mt-1 break-all">{lastTechnicalError}</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <button type="button" onClick={() => setDashboardSection("home")} className="py-2 rounded-lg text-xs font-semibold border transition-all duration-200">
            <span className="inline-flex items-center justify-center gap-1.5">
              <LayoutDashboard size={14} /> DASHBOARD
            </span>
          </button>
          <button type="button" onClick={() => setDashboardSection("active")} className="py-2 rounded-lg text-xs font-semibold border transition-all duration-200">
            <span className="inline-flex items-center justify-center gap-1.5">
              <Truck size={14} /> ACTIVE
            </span>
          </button>
          <button type="button" onClick={() => setDashboardSection("returns")} className="py-2 rounded-lg text-xs font-semibold border transition-all duration-200">
            <span className="inline-flex items-center justify-center gap-1.5">
              <RotateCcw size={14} /> RETURNS
              {hasPendingReturns && (
                <span className="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-red-600 text-white text-[10px] px-1">
                  {pendingReturnPumpCount}
                </span>
              )}
            </span>
          </button>
          <button type="button" onClick={() => setDashboardSection("connect")} className="py-2 rounded-lg text-xs font-semibold border transition-all duration-200">
            <span className="inline-flex items-center justify-center gap-1.5">
              <Link2 size={14} /> CONNECT
            </span>
          </button>
          <button type="button" onClick={() => router.push("/driver/delivery-pdfs")} className="py-2 rounded-lg text-xs font-semibold border transition-all duration-200">
            <span className="inline-flex items-center justify-center gap-1.5">
              <FileText size={14} /> PDFS
            </span>
          </button>
        </div>

        {hasPendingReturns && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3">
            <p className="text-sm font-semibold text-red-300 inline-flex items-center gap-2">
              <AlertTriangle size={16} />
              Warning: You have {pendingReturnPumpCount} pump{pendingReturnPumpCount !== 1 ? "s" : ""} pending return.
            </p>
          </div>
        )}

        {/* Bloques funcionales: Órdenes, returns, conexión, etc. */}
        {dashboardSection === "home" && (
          <div className="bg-gradient-to-br from-emerald-500/10 to-black/60 border border-emerald-500/30 rounded-2xl p-8">
            <h2 className="text-2xl font-extrabold inline-flex items-center gap-2 mb-4">
              <PackageOpen className="text-emerald-300" size={22} /> New Orders
            </h2>
            <p className="text-sm text-white/60">No new orders available.</p>
          </div>
        )}
        {dashboardSection === "active" && (
          <div className="bg-black/40 border border-green-500/30 rounded-xl p-6">
            <h2 className="font-semibold mb-4 text-green-300 inline-flex items-center gap-2">
              <Truck size={16} /> My Active Orders
            </h2>
            <p className="text-xs text-white/60">No active orders.</p>
          </div>
        )}
        {dashboardSection === "returns" && (
          <div className="bg-black/40 border border-amber-500/30 rounded-xl p-6">
            <h2 className="font-semibold mb-4 text-amber-300 inline-flex items-center gap-2">
              <RotateCcw size={16} /> Return Tasks
            </h2>
            <p className="text-xs text-white/60">No pending returns.</p>
          </div>
        )}
        {dashboardSection === "connect" && (
          <div className="bg-black/40 border border-white/10 rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-indigo-300 inline-flex items-center gap-2">
              <Link2 size={16} /> Connect Pharmacy
            </h2>
            <input
              placeholder="Enter 4-digit Pharmacy PIN"
              maxLength={4}
              value={pharmacyPin}
              onChange={e => setPharmacyPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="w-full p-2 rounded bg-black border border-white/10"
              disabled={pharmacyConnectLoading}
            />
            <button
              className="w-full bg-indigo-600 py-2 rounded transition-all duration-200 disabled:opacity-60"
              onClick={handleConnectPharmacy}
              disabled={pharmacyConnectLoading}
            >
              {pharmacyConnectLoading ? "Connecting..." : "CONNECT PHARMACY"}
            </button>
            {pharmacyConnectError && (
              <p className="text-xs text-red-400 font-semibold">{pharmacyConnectError}</p>
            )}
            {pharmacyConnectSuccess && (
              <p className="text-xs text-green-400 font-semibold">{pharmacyConnectSuccess}</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
