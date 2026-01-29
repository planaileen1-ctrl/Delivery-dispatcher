"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function PharmaciesMenuPage() {
  const router = useRouter();
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPharmacies = async () => {
      const snapshot = await getDocs(collection(db, "pharmacies"));
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setPharmacies(data);
      setLoading(false);
    };

    loadPharmacies();
  }, []);

  if (loading) {
    return <p className="text-center mt-10">Loading pharmacies...</p>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 🔙 Back */}
      <button
        onClick={() => router.push("/admin/dashboard")}
        className="mb-6 text-sm text-blue-600 hover:underline"
      >
        ← Back to Dashboard
      </button>

      <h1 className="text-3xl font-bold mb-8">
        Pharmacies
      </h1>

      <div className="grid md:grid-cols-2 gap-6">
        {pharmacies.map((pharmacy) => (
          <div
            key={pharmacy.id}
            className="bg-white rounded-xl shadow p-6 cursor-pointer hover:shadow-lg transition"
            onClick={() =>
              router.push(
                `/admin/pharmacies/menu/${pharmacy.id}`
              )
            }
          >
            <h2 className="text-xl font-semibold">
              {pharmacy.name}
            </h2>

            <p className="text-gray-600 text-sm mt-1">
              Representative: {pharmacy.representative}
            </p>

            <p className="text-gray-500 text-xs mt-2">
              Email: {pharmacy.email}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
