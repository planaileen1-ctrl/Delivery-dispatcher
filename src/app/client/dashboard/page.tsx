"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

type DeliveryUI = {
  id: string;
  pumpCodes: string[];
  status: string;
  pharmacyName: string;
  driverName: string;
  createdAt?: Timestamp;
  receivedAt?: Timestamp;
  type?: string;
  originalDeliveryId?: string;
};

export default function ClientDashboard() {
  const [deliveries, setDeliveries] = useState<DeliveryUI[]>([]);
  const [returnMap, setReturnMap] = useState<Record<string, boolean>>({});
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("client");
    if (!stored) {
      router.push("/client/login");
      return;
    }

    const client = JSON.parse(stored);

    // ✅ FIX REAL: whitelist de estados visibles al cliente
    const q = query(
      collection(db, "deliveries"),
      where("clientId", "==", client.id),
      where("status", "in", [
        "assigned",
        "picked_up",
        "delivered",
        "received_by_client",
      ])
    );

    const unsub = onSnapshot(q, async (snap) => {
      const result: DeliveryUI[] = [];
      const returns: Record<string, boolean> = {};

      // detectar devoluciones
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.type === "return" && data.originalDeliveryId) {
          returns[data.originalDeliveryId] = true;
        }
      });

      for (const d of snap.docs) {
        const delivery = d.data();

        if (delivery.type === "return") continue;

        let pharmacyName = "—";
        if (delivery.pharmacyId) {
          const phSnap = await getDoc(
            doc(db, "pharmacies", delivery.pharmacyId)
          );
          if (phSnap.exists()) {
            pharmacyName = phSnap.data().name;
          }
        }

        let driverName = "—";
        if (delivery.driverId) {
          const drSnap = await getDoc(
            doc(db, "deliveryDrivers", delivery.driverId)
          );
          if (drSnap.exists()) {
            driverName = drSnap.data().name;
          }
        }

        result.push({
          id: d.id,
          pumpCodes: delivery.pumpCodes || [],
          status: delivery.status,
          createdAt: delivery.createdAt,
          receivedAt: delivery.receivedAt,
          pharmacyName,
          driverName,
          type: delivery.type,
        });
      }

      setReturnMap(returns);
      setDeliveries(result);
    });

    return () => unsub();
  }, [router]);

  const confirmReceived = async (deliveryId: string) => {
    await updateDoc(doc(db, "deliveries", deliveryId), {
      status: "received_by_client",
      receivedAt: new Date(),
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={() => router.push("/")}
        className="text-blue-600 hover:underline mb-6"
      >
        ← Back to menu
      </button>

      <h1 className="text-2xl font-bold mb-6">
        My Pumps
      </h1>

      {deliveries.length === 0 && (
        <p className="text-gray-500">
          No pumps assigned.
        </p>
      )}

      <div className="space-y-4">
        {deliveries.map((d) => (
          <div
            key={d.id}
            className="border rounded-lg p-5 bg-white shadow"
          >
            <p className="font-semibold mb-2">
              Pump Codes:
            </p>

            <ul className="list-disc ml-5 mb-3">
              {d.pumpCodes.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>

            <p><strong>Pharmacy:</strong> {d.pharmacyName}</p>
            <p><strong>Driver:</strong> {d.driverName}</p>
            <p><strong>Status:</strong> {d.status}</p>

            {d.status === "delivered" && (
              <button
                onClick={() => confirmReceived(d.id)}
                className="mt-4 bg-green-600 text-white px-4 py-2 rounded"
              >
                I received the pumps
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
