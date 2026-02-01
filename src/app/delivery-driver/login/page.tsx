"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function DriverLoginPage() {
  const router = useRouter();

  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!pin) {
      setError("PIN requerido");
      return;
    }

    try {
      setLoading(true);

      const q = query(
        collection(db, "deliveryDrivers"),
        where("pin", "==", pin),
        where("active", "==", true)
      );

      const snap = await getDocs(q);

      if (snap.empty) {
        setError("PIN inválido o conductor inactivo");
        return;
      }

      const docSnap = snap.docs[0];
      const data = docSnap.data();

      // ✅ GUARDAR DRIVER REAL
      localStorage.setItem(
        "driver",
        JSON.stringify({
          id: docSnap.id,
          name: data.name,
          email: data.email,
          country: data.country,
          state: data.state,
          city: data.city,
        })
      );

      router.push("/delivery-driver/dashboard");
    } catch (err) {
      console.error(err);
      setError("Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm space-y-4"
      >
        <h1 className="text-2xl font-bold text-center">
          Driver Access
        </h1>

        <input
          type="password"
          placeholder="Enter PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="w-full border p-2 rounded text-center tracking-widest"
        />

        {error && (
          <p className="text-red-600 text-sm text-center">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-600 text-white py-2 rounded"
        >
          {loading ? "Checking..." : "Enter"}
        </button>

        {/* ✅ LINK DE REGISTRO (NUNCA SE BORRA) */}
        <p className="text-sm text-center">
          ¿No tienes cuenta?{" "}
          <a
            href="/delivery-driver/register"
            className="text-blue-600 underline"
          >
            Register as a Driver
          </a>
        </p>
      </form>
    </div>
  );
}
