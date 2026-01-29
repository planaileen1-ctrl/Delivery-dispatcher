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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => router.push("/admin/dashboard")}
          className="mb-6 text-sm text-blue-700 hover:underline"
        >
          ← Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold text-gray-800 mb-8">
          Pharmacies
        </h1>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {pharmacies.map((pharmacy) => {
            const isSuspended = pharmacy.suspended === true;

            return (
              <div
                key={pharmacy.id}
                onClick={() =>
                  router.push(`/admin/pharmacies/menu/${pharmacy.id}`)
                }
                className={`rounded-2xl border shadow-sm p-6 cursor-pointer transition
                  ${
                    isSuspended
                      ? "bg-red-50 border-red-200 hover:shadow-md"
                      : "bg-white hover:shadow-xl hover:-translate-y-1"
                  }
                `}
              >
                {/* Header */}
                <div className="flex justify-between items-start">
                  <h2 className="text-lg font-semibold text-gray-800">
                    {pharmacy.name}
                  </h2>

                  {isSuspended ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                      Suspended
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                      Active
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="mt-4 space-y-1">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Representative:</span>{" "}
                    {pharmacy.representative}
                  </p>

                  <p className="text-xs text-gray-500">
                    {pharmacy.email}
                  </p>
                </div>

                {/* Footer */}
                <div className="mt-4 text-right">
                  <span className="text-sm text-indigo-600 font-medium">
                    Manage →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
