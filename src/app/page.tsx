"use client";

import { useState } from "react";

/* =========================
   HOOKS
========================= */
import { useAuth } from "@/hooks/useAuth";
import { useFirestoreSubs } from "@/hooks/useFirestoreSubs";

/* =========================
   UI
========================= */
import LoadingScreen from "@/components/ui/LoadingScreen";
import ErrorScreen from "@/components/ui/ErrorScreen";

/* =========================
   VIEWS
========================= */
import SelectionView from "@/views/SelectionView";
import RegisterView from "@/views/RegisterView";
import SuperAdminView from "@/views/SuperAdminView";
import DriverWorkflow from "@/views/DriverWorkflow";

/* =========================
   TYPES
========================= */
import { Employee, Order } from "@/types";

export default function Page() {
  /* ---------- AUTH ---------- */
  const { user, loading, error } = useAuth();

  /* ---------- DATA ---------- */
  const { orders, pumps, employees, drivers } =
    useFirestoreSubs(!!user);

  /* ---------- UI STATE ---------- */
  const [view, setView] = useState<
    "selection" | "login" | "register" | "super_admin" | "driver_market"
  >("selection");

  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [activeEmployee, setActiveEmployee] =
    useState<Employee | null>(null);

  /* =========================
     GUARDS
  ========================= */
  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <ErrorScreen
        msg={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  /* =========================
     PIN HANDLER (SOLO LOGIN NORMAL)
  ========================= */
  const handlePinInput = (digit: string) => {
    if (pin.length >= 4) return;

    const next = pin + digit;
    setPin(next);

    if (next.length === 4) {
      /* 👨‍⚕️ PHARMACY / STAFF */
      const emp = employees.find((e) => e.pin === next);
      if (emp) {
        setActiveEmployee(emp);
        setPin("");
        setView("driver_market");
        return;
      }

      /* 🚚 DRIVER */
      const dri = drivers.find((d) => d.pin === next);
      if (dri) {
        setActiveEmployee(dri);
        setPin("");
        setView("driver_market");
        return;
      }

      /* ❌ FAIL */
      setLoginError("PIN INCORRECT");
      setTimeout(() => {
        setPin("");
        setLoginError("");
      }, 1000);
    }
  };

  /* =========================
     DRIVER FLOW
  ========================= */
  if (view === "driver_market" && activeEmployee) {
    const activeOrder = orders.find(
      (o: Order) =>
        o.claimedBy === activeEmployee.id &&
        o.status !== "delivered"
    );

    if (activeOrder) {
      return (
        <DriverWorkflow
          order={activeOrder}
          allPumps={pumps}
          user={activeEmployee}
        />
      );
    }

    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <p className="font-black text-xs uppercase text-slate-600">
          No active orders
        </p>
        <button
          onClick={() => {
            setActiveEmployee(null);
            setView("selection");
            setPin("");
          }}
          className="mt-4 text-indigo-600 text-xs font-bold"
        >
          Logout
        </button>
      </div>
    );
  }

  /* =========================
     MAIN ROUTER
  ========================= */
  switch (view) {
    case "selection":
      return (
        <SelectionView
          onLogin={() => setView("login")}
          onRegister={() => setView("register")}
          onAdmin={() => setView("super_admin")}
        />
      );

    case "login":
      return (
        <div className="h-screen bg-[#0f172a] flex flex-col items-center p-8 text-white">
          <h2 className="text-3xl font-black uppercase mb-8">
            Enter PIN
          </h2>

          <div className="flex gap-3 mb-10">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${
                  pin.length > i
                    ? "bg-emerald-500"
                    : "bg-slate-700"
                }`}
              />
            ))}
          </div>

          {loginError && (
            <p className="text-red-500 text-xs font-black mb-4">
              {loginError}
            </p>
          )}

          <div className="grid grid-cols-3 gap-4 w-full max-w-[260px]">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button
                key={n}
                onClick={() => handlePinInput(n.toString())}
                className="h-16 rounded-2xl bg-white/5 text-2xl font-black"
              >
                {n}
              </button>
            ))}

            <button
              onClick={() => setPin("")}
              className="h-16 rounded-2xl bg-red-500/10 text-red-500 text-xs font-black"
            >
              CLR
            </button>

            <button
              onClick={() => handlePinInput("0")}
              className="h-16 rounded-2xl bg-white/5 text-2xl font-black"
            >
              0
            </button>
          </div>
        </div>
      );

    case "register":
      return <RegisterView onBack={() => setView("selection")} />;

    case "super_admin":
      return (
        <SuperAdminView
          onLogout={() => {
            setView("selection");
          }}
        />
      );

    default:
      return null;
  }
}
