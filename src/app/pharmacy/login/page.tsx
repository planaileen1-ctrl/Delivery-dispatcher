"use client";

import { useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function PharmacyPinLogin() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    setError("");

    if (pin.length !== 4) {
      setError("PIN must be 4 digits");
      return;
    }

    try {
      setLoading(true);

      const q = query(
        collection(db, "pharmacies"),
        where("pin", "==", pin)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError("Invalid PIN");
        return;
      }

      const docSnap = snapshot.docs[0];
      const data = docSnap.data();

      // 🚫 bloqueada
      if (data.suspended) {
        setError(
          "This pharmacy account is suspended. Contact support."
        );
        return;
      }

      const pharmacy = {
        id: docSnap.id,
        name: data.name,
        email: data.email,
        state: data.state,
        city: data.city,
      };

      // 💾 persistir sesión
      localStorage.setItem(
        "pharmacy",
        JSON.stringify(pharmacy)
      );

      router.push(`/pharmacy/${pharmacy.id}`);
    } catch (err) {
      console.error(err);
      setError("Error validating PIN");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm relative">

        {/* 🔙 BACK */}
        <button
          onClick={() => router.push("/")}
          className="absolute left-4 top-4 text-sm text-blue-600 hover:underline"
        >
          ← Back to menu
        </button>

        <h1 className="text-2xl font-bold mb-6 text-center mt-6">
          Pharmacy Access
        </h1>

        {/* 🔢 PIN INPUT */}
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          autoComplete="one-time-code"
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
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition disabled:opacity-60"
        >
          {loading ? "Checking..." : "Enter"}
        </button>

        {/* ➕ REGISTER */}
        <p className="text-center text-sm text-gray-500 mt-6">
          New pharmacy?{" "}
          <button
            onClick={() =>
              router.push("/pharmacy/register")
            }
            className="text-blue-600 hover:underline"
          >
            Register here
          </button>
        </p>
      </div>
    </div>
  );
}
