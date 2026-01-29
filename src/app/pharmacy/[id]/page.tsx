"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function PharmacyDashboard() {
  const router = useRouter();
  const [pharmacy, setPharmacy] = useState<any>(null);

  useEffect(() => {
    const data = localStorage.getItem("pharmacy");

    if (!data) {
      router.push("/pharmacy/login");
      return;
    }

    setPharmacy(JSON.parse(data));
  }, []);

  if (!pharmacy) return <p>Loading...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">
        Welcome, {pharmacy.name}
      </h1>

      <div className="mt-6 space-y-4">
        <button
          onClick={() =>
            router.push(`/pharmacy/${pharmacy.id}/create-client`)
          }
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Create Client
        </button>

        <button
          onClick={() =>
            router.push(`/pharmacy/${pharmacy.id}/create-delivery`)
          }
          className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition"
        >
          Create Delivery
        </button>
      </div>
    </div>
  );
}
