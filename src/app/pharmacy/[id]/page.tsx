"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function PharmacyDashboard() {
  const router = useRouter();
  const [pharmacy, setPharmacy] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPharmacy = async () => {
      const stored = localStorage.getItem("pharmacy");

      if (!stored) {
        router.push("/pharmacy/login");
        return;
      }

      const localPharmacy = JSON.parse(stored);

      const ref = doc(db, "pharmacies", localPharmacy.id);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        localStorage.removeItem("pharmacy");
        alert("Pharmacy not found");
        router.push("/pharmacy/login");
        return;
      }

      const data = snap.data();

      if (data.suspended === true) {
        localStorage.removeItem("pharmacy");
        alert("This pharmacy is suspended. Access denied.");
        router.push("/pharmacy/login");
        return;
      }

      setPharmacy({ id: snap.id, ...data });
      setLoading(false);
    };

    loadPharmacy();
  }, [router]);

  const handleBackToMenu = () => {
    localStorage.removeItem("pharmacy");
    router.push("/pharmacy/login");
  };

  if (loading) {
    return <p className="mt-10 text-center">Loading...</p>;
  }

  if (!pharmacy) return null;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      
      {/* 🔙 NAV LINKS */}
      <div className="mb-6 flex items-center gap-4 text-sm">
        <button
          onClick={handleBackToMenu}
          className="text-blue-600 hover:underline"
        >
          ← Back to menu
        </button>

        <span className="text-gray-400">|</span>

        <button
          onClick={() => router.push("/dashboard")}
          className="text-blue-600 hover:underline"
        >
          Back to dashboard
        </button>
      </div>

      <h1 className="text-2xl font-bold mb-6">
        Welcome, {pharmacy.name}
      </h1>

      <div className="space-y-4">
        <button
          onClick={() =>
            router.push(`/pharmacy/${pharmacy.id}/create-client`)
          }
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
        >
          Create Client
        </button>

        <button
          onClick={() =>
            router.push(`/pharmacy/${pharmacy.id}/create-delivery`)
          }
          className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition"
        >
          Create Delivery
        </button>
      </div>
    </div>
  );
}
