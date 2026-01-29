"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function PharmacyDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<any[]>([]);

  useEffect(() => {
    const pharmacy = JSON.parse(localStorage.getItem("pharmacy")!);

    const q = query(
      collection(db, "deliveries"),
      where("pharmacyId", "==", pharmacy.id)
    );

    const unsub = onSnapshot(q, (snap) => {
      setDeliveries(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
    });

    return () => unsub();
  }, []);

  const statusColor = (s: string) =>
    s === "created"
      ? "gray"
      : s === "in_transit"
      ? "orange"
      : "green";

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        Deliveries Status
      </h1>

      <div className="space-y-4">
        {deliveries.map((d) => (
          <div
            key={d.id}
            className="border rounded-xl p-4 bg-white"
          >
            <p className="font-semibold">
              Client: {d.clientName}
            </p>
            <p className="text-sm">
              Address: {d.deliveryAddress}
            </p>

            <p className={`text-${statusColor(d.status)}-600 font-bold`}>
              Status: {d.status.toUpperCase()}
            </p>

            {d.deliveredAt && (
              <p className="text-xs text-gray-500">
                Delivered at:{" "}
                {new Date(d.deliveredAt.seconds * 1000).toLocaleString()}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
