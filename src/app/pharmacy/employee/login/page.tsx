"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function EmployeeLoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const pharmacy = localStorage.getItem("pharmacy");
    if (!pharmacy) router.push("/pharmacy/login");
  }, [router]);

  const handleLogin = async () => {
    const pharmacy = JSON.parse(
      localStorage.getItem("pharmacy")!
    );

    const q = query(
      collection(db, "pharmacyEmployees"),
      where("pharmacyId", "==", pharmacy.id),
      where("pin", "==", pin),
      where("active", "==", true)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      setError("Invalid PIN");
      return;
    }

    router.push(`/pharmacy/${pharmacy.id}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded shadow w-full max-w-sm">
        <h1 className="text-xl font-bold text-center mb-4">
          Employee Access
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
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white py-3 rounded"
        >
          Enter
        </button>
      </div>
    </div>
  );
}
