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
    if (pin.length !== 4) {
      setError("PIN must be 4 digits");
      return;
    }

    try {
      setLoading(true);
      setError("");

      console.log("Checking PIN:", pin); // 🔹 debug

      // 🔹 Buscar farmacia por PIN (sin filtro active para probar)
      const q = query(collection(db, "pharmacies"), where("pin", "==", pin));

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError("Invalid PIN");
        return;
      }

      const doc = snapshot.docs[0];
      const pharmacy = {
        id: doc.id,
        name: doc.data().name,
      };

      console.log("Found pharmacy:", pharmacy); // 🔹 debug

      // 🔹 Guardar farmacia en localStorage
      localStorage.setItem("pharmacy", JSON.stringify(pharmacy));

      // 🔹 Redirigir al dashboard
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
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Pharmacy Access
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
          className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition"
        >
          {loading ? "Checking..." : "Enter"}
        </button>
      </div>
    </div>
  );
}
