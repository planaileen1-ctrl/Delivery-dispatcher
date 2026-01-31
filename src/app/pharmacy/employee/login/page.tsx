"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function EmployeeLoginPage() {
  const router = useRouter();

  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [pharmacy, setPharmacy] = useState<any>(null);
  const [ready, setReady] = useState(false);

  // 🔐 Load pharmacy safely (CLIENT ONLY)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem("pharmacy");
    if (!stored) {
      router.push("/pharmacy/login");
      return;
    }

    setPharmacy(JSON.parse(stored));
    setReady(true);
  }, [router]);

  // ⛔ Block render until client ready
  if (!ready) return null;

  const handleLogin = async () => {
    setError("");

    if (pin.length !== 4) {
      setError("PIN must be 4 digits");
      return;
    }

    try {
      const q = query(
        collection(db, "pharmacyEmployees"),
        where("pharmacyId", "==", pharmacy.id),
        where("pin", "==", pin),
        where("active", "==", true)
      );

      const snap = await getDocs(q);

      if (snap.empty) {
        setError("Invalid PIN");
        return;
      }

      // ✅ ENTER PHARMACY DASHBOARD
      router.push(`/pharmacy/${pharmacy.id}`);
    } catch (e) {
      console.error(e);
      setError("Login error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded shadow w-full max-w-sm">
        <h1 className="text-xl font-bold text-center mb-4">
          Employee Access
        </h1>

        <input
          value={pin}
          onChange={(e) =>
            setPin(e.target.value.replace(/\D/g, ""))
          }
          maxLength={4}
          className="w-full text-center text-2xl tracking-widest border p-3 mb-4"
          placeholder="••••"
        />

        {error && (
          <p className="text-red-600 text-sm text-center mb-3">
            {error}
          </p>
        )}

        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white py-3 rounded"
        >
          Enter
        </button>
      </div>
    </div>
  );
}
