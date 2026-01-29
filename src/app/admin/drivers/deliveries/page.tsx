"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

type Delivery = {
  id: string;
  deliveryAddress: string;
  pumpCodes: string[];
  status: string;
};

export default function DriverDeliveriesPage() {
  const router = useRouter();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("driver");
    if (!stored) return router.push("/driver/login");

    const driver = JSON.parse(stored);
    setDriverId(driver.id);

    const load = async () => {
      const q = query(
        collection(db, "deliveries"),
        where("driverId", "==", driver.id),
        where("status", "==", "created")
      );

      const snap = await getDocs(q);

      setDeliveries(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }))
      );
    };

    load();
  }, [router]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        My Deliveries
      </h1>

      {deliveries.length === 0 ? (
        <p>No pending deliveries</p>
      ) : (
        <div className="space-y-4">
          {deliveries.map((d) => (
            <div
              key={d.id}
              className="border rounded-xl p-4 bg-white shadow"
            >
              <p className="font-semibold">
                Address: {d.deliveryAddress}
              </p>
              <p className="text-sm text-gray-600">
                Pumps: {d.pumpCodes.join(", ")}
              </p>

              <button
                onClick={() =>
                  router.push(`/driver/deliveries/${d.id}`)
                }
                className="mt-3 text-blue-600 hover:underline text-sm"
              >
                Confirm Delivery →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
