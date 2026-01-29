"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function DriverLoginPage() {
  const router = useRouter();

  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");

    if (pin.length !== 4) {
      setError("PIN must be 4 digits");
      return;
    }

    try {
      setLoading(true);

      const q = query(
        collection(db, "deliveryDrivers"),
        where("pin", "==", pin),
        where("active", "==", true)
      );

      const snap = await getDocs(q);

      if (snap.empty) {
        setError("Invalid PIN");
        return;
      }

      const driverDoc = snap.docs[0];

      localStorage.setItem(
        "driver",
        JSON.stringify({
          id: driverDoc.id,
          ...driverDoc.data(),
        })
      );

      router.push("/driver/deliveries");
    } catch (err) {
      setError("System error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Driver Access
        </h1>

        <input
          type="password"
          maxLength={4}
          value={pin}
          onChange={(e) =>
            setPin(e.target.value.replace(/\D/g, ""))
          }
          className="w-full text-center text-2xl tracking-widest border rounded-lg p-3 mb-4"
          placeholder="••••"
        />

        {error && (
          <p className="text-red-600 text-sm mb-4 text-center">
            {error}
          </p>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
        >
          {loading ? "Checking..." : "Enter"}
        </button>
      </div>
    </div>
  );
}
