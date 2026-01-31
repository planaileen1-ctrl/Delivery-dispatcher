"use client";

import { useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
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

      const snap = await getDocs(q);

      if (snap.empty) {
        setError("Invalid PIN");
        return;
      }

      const doc = snap.docs[0];
      const data = doc.data();

      if (data.suspended) {
        setError("This pharmacy account is suspended.");
        return;
      }

      localStorage.setItem(
        "pharmacy",
        JSON.stringify({
          id: doc.id,
          name: data.name,
          email: data.email,
        })
      );

      router.push("/pharmacy/employee");
    } catch (e) {
      setError("Login error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow w-full max-w-sm">
        <h1 className="text-xl font-bold text-center mb-4">
          Pharmacy Access
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
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-green-600 text-white py-3 rounded"
        >
          {loading ? "Checking..." : "Enter"}
        </button>
      </div>
    </div>
  );
}
