"use client";

import { useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function AdminPinLogin() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (pin.length !== 4) {
      setError("PIN must be 4 digits");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const docRef = doc(db, "settings", "admin");
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        setError("Admin PIN not configured");
        return;
      }

      const adminPin = docSnap.data().pin;

      if (pin === adminPin) {
        router.push("/admin/dashboard");
      } else {
        setError("Invalid PIN");
      }
    } catch (err) {
      setError("Error validating PIN");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Administrator Access
        </h1>

        <input
          type="password"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
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
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
        >
          {loading ? "Checking..." : "Enter"}
        </button>
      </div>
    </div>
  );
}
