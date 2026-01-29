"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function DriverLoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (pin.length !== 4) {
      setError("PIN must be 4 digits");
      return;
    }

    try {
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

      const driver = snap.docs[0];

      localStorage.setItem("driverId", driver.id);
      localStorage.setItem("driverName", driver.data().name);

      router.push("/delivery-driver/dashboard");
    } catch (err) {
      console.error(err);
      setError("Login error");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-6 rounded shadow w-80"
      >
        <h1 className="text-xl font-bold text-center mb-4">
          Driver Access
        </h1>

        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          className="border w-full p-2 text-center text-lg tracking-widest mb-3"
          placeholder="••••"
        />

        {error && (
          <p className="text-red-500 text-sm text-center mb-3">
            {error}
          </p>
        )}

        <button className="bg-orange-500 text-white w-full py-2 rounded">
          Enter
        </button>
      </form>
    </div>
  );
}
