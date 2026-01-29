"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AdminLoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validación básica
    if (pin.length !== 4) {
      setError("PIN must be 4 digits");
      return;
    }

    try {
      // Leer settings/admin
      const ref = doc(db, "settings", "admin");
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        setError("Admin settings not found");
        return;
      }

      const adminPin = snap.data().pin; // "1844"

      if (adminPin === pin) {
        // Login correcto
        router.push("/admin/dashboard");
      } else {
        setError("Invalid PIN");
      }
    } catch (err) {
      console.error("Admin login error:", err);
      setError("Login error");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-6 rounded-lg shadow-md w-80"
      >
        <h1 className="text-xl font-bold text-center mb-4">
          Admin Access
        </h1>

        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) =>
            setPin(e.target.value.replace(/\D/g, ""))
          }
          className="border w-full p-2 text-center text-lg tracking-widest mb-3"
          placeholder="••••"
        />

        {error && (
          <p className="text-red-500 text-sm text-center mb-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="bg-orange-500 hover:bg-orange-600 text-white w-full py-2 rounded"
        >
          Enter
        </button>
      </form>
    </div>
  );
}
