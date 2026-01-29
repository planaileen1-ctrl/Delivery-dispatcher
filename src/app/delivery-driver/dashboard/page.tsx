"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

type Delivery = {
  id: string;
  deliveryAddress: string;
  pumpCodes: string[];
  status: string;
  clientId: string;
  clientName?: string;
  clientPhone?: string;
};

export default function DriverDashboard() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const router = useRouter();

  useEffect(() => {
    const driverId = localStorage.getItem("driverId");

    if (!driverId) {
      router.push("/delivery-driver/login");
      return;
    }

    const q = query(
      collection(db, "deliveries"),
      where("driverId", "==", driverId)
    );

    const unsub = onSnapshot(q, async (snap) => {
      const enriched: Delivery[] = await Promise.all(
        snap.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Delivery, "id">),
          }))
          .filter((d) => d.status !== "delivered")
          .map(async (delivery) => {
            try {
              const clientSnap = await getDoc(
                doc(db, "clients", delivery.clientId)
              );

              if (clientSnap.exists()) {
                return {
                  ...delivery,
                  clientName: clientSnap.data().name,
                  clientPhone: clientSnap.data().phone,
                };
              }

              return delivery;
            } catch {
              return delivery;
            }
          })
      );

      setDeliveries(enriched);
    });

    return () => unsub();
  }, [router]);

  const updateStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, "deliveries", id), { status });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        My Deliveries
      </h1>

      {deliveries.length === 0 && (
        <p>No deliveries assigned.</p>
      )}

      <div className="space-y-4">
        {deliveries.map((d) => (
          <div
            key={d.id}
            className="border rounded p-4 bg-white shadow"
          >
            <p>
              <strong>Client:</strong>{" "}
              {d.clientName || "Unknown"}
            </p>

            {d.clientPhone && (
              <p>
                <strong>Phone:</strong>{" "}
                {d.clientPhone}
              </p>
            )}

            <p>
              <strong>Address:</strong>{" "}
              {d.deliveryAddress}
            </p>

            <p className="mt-2">
              <strong>Pump Codes:</strong>
            </p>
            <ul className="list-disc ml-5">
              {d.pumpCodes?.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>

            <p className="mt-2">
              <strong>Status:</strong> {d.status}
            </p>

            <div className="flex gap-2 mt-4">
              {d.status === "created" && (
                <button
                  onClick={() =>
                    updateStatus(d.id, "picked_up")
                  }
                  className="bg-blue-500 text-white px-3 py-1 rounded"
                >
                  Receive
                </button>
              )}

              {d.status === "picked_up" && (
                <button
                  onClick={() =>
                    updateStatus(d.id, "on_route")
                  }
                  className="bg-orange-500 text-white px-3 py-1 rounded"
                >
                  On Route
                </button>
              )}

              {d.status === "on_route" && (
                <button
                  onClick={() =>
                    updateStatus(d.id, "delivered")
                  }
                  className="bg-green-600 text-white px-3 py-1 rounded"
                >
                  Delivered
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
