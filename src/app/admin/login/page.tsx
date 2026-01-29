"use client";

import { useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function AdminPinLogin() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async () => {
    try {
      const ref = doc(db, "settings", "admin");
      const snap = await getDoc(ref);

      console.log("INPUT PIN:", pin);

      if (!snap.exists()) {
        setError("Admin config not found");
        return;
      }

      const dbPin = snap.data().pin;

      console.log("DB PIN:", dbPin, typeof dbPin);

      if (Number(pin) !== Number(dbPin)) {
        setError("Invalid PIN");
        return;
      }

      router.push("/admin/dashboard");
    } catch (e) {
      console.error(e);
      setError("System error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow w-80">
        <h1 className="text-xl font-bold mb-4 text-center">
          Administrator Access
        </h1>

        <input
          value={pin}
          maxLength={4}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          className="w-full border p-3 text-center text-2xl tracking-widest"
          placeholder="••••"
        />

        {error && (
          <p className="text-red-600 text-sm mt-3 text-center">
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          className="w-full bg-blue-600 text-white py-3 mt-4 rounded"
        >
          Enter
        </button>
      </div>
    </div>
  );
}
