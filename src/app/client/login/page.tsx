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

export default function ClientLoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    setError("");

    if (!pin || pin.length !== 4) {
      setError("Enter your 4-digit PIN");
      return;
    }

    const q = query(
      collection(db, "clients"),
      where("pin", "==", pin)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      setError("Invalid PIN");
      return;
    }

    // ⚠️ asumimos PIN único por farmacia
    const clientDoc = snap.docs[0];
    const data = clientDoc.data();

    // 🔐 Guardamos sesión
    localStorage.setItem(
      "client",
      JSON.stringify({
        id: clientDoc.id,
        name: data.name,
        pharmacyId: data.pharmacyId,
      })
    );

    router.push("/client/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-6 rounded-lg shadow w-full max-w-sm">
        <h1 className="text-xl font-bold mb-4 text-center">
          Client Login
        </h1>

        {error && (
          <p className="text-red-600 mb-3 text-sm text-center">
            {error}
          </p>
        )}

        <input
          type="password"
          placeholder="4-digit PIN"
          value={pin}
          maxLength={4}
          onChange={(e) =>
            setPin(e.target.value)
          }
          className="w-full border rounded px-3 py-2 mb-4 text-center tracking-widest"
        />

        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Login
        </button>
      </div>
    </div>
  );
}
