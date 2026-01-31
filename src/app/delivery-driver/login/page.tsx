"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function DriverLoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (pin.length !== 4) {
      setError("PIN must be exactly 4 digits");
      return;
    }

    setLoading(true);

    try {
      const q = query(
        collection(db, "deliveryDrivers"),
        where("pin", "==", pin),
        where("active", "==", true)
      );

      const snap = await getDocs(q);

      if (snap.empty) {
        setError("Invalid PIN or inactive driver");
        setLoading(false);
        return;
      }

      const driver = snap.docs[0];

      localStorage.setItem("driverId", driver.id);
      localStorage.setItem("driverName", driver.data().name);

      router.push("/delivery-driver/dashboard");
    } catch (err) {
      console.error(err);
      setError("Login error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-6 rounded shadow w-80 space-y-4"
      >
        <h1 className="text-xl font-bold text-center">
          Driver Access
        </h1>

        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          className="border w-full p-2 text-center text-lg tracking-widest"
          placeholder="••••"
          required
        />

        {error && (
          <p className="text-red-500 text-sm text-center">
            {error}
          </p>
        )}

        <button
          disabled={loading}
          className="bg-orange-500 text-white w-full py-2 rounded disabled:opacity-50"
        >
          {loading ? "Checking..." : "Enter"}
        </button>

        {/* 🔹 Registro */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => router.push("/delivery-driver/register")}
            className="text-sm text-gray-600 underline hover:text-orange-500"
          >
            Register as a Driver
          </button>
        </div>
      </form>
    </div>
  );
}
