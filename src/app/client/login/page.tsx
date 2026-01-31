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

    const clientDoc = snap.docs[0];
    const data = clientDoc.data();

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
      <div className="bg-white p-6 rounded-lg shadow w-full max-w-sm relative">

        {/* 🔙 BACK */}
        <button
          onClick={() => router.push("/")}
          className="absolute left-4 top-4 text-sm text-blue-600 hover:underline"
        >
          ← Back to menu
        </button>

        <h1 className="text-xl font-bold mb-4 text-center mt-6">
          Client Login
        </h1>

        {error && (
          <p className="text-red-600 mb-3 text-sm text-center">
            {error}
          </p>
        )}

        {/* 🔢 NUMERIC PIN INPUT */}
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="••••"
          value={pin}
          maxLength={4}
          onChange={(e) =>
            setPin(e.target.value.replace(/\D/g, ""))
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") handleLogin();
          }}
          className="w-full border rounded px-3 py-2 mb-4 text-center tracking-widest text-xl"
        />

        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          Login
        </button>
      </div>
    </div>
  );
}
