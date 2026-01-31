"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type DeliveryUI = {
  id: string;
  pumpCodes: string[];
  status: string;
  pharmacyName: string;
  driverName: string;
  hasReturn?: boolean;
  deliveredAt?: Timestamp;
};

export default function ClientDashboard() {
  const [deliveries, setDeliveries] = useState<DeliveryUI[]>([]);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("client");
    if (!stored) {
      router.push("/client/login");
      return;
    }

    const client = JSON.parse(stored);

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
      const list: DeliveryUI[] = [];

      for (const d of snap.docs) {
        const data = d.data();

        if (data.type === "return") continue;

        let pharmacyName = "—";
        if (data.pharmacyId) {
          const ph = await getDoc(
            doc(db, "pharmacies", data.pharmacyId)
          );
          if (ph.exists()) pharmacyName = ph.data().name;
        }

        let driverName = "—";
        if (data.driverId) {
          const dr = await getDoc(
            doc(db, "deliveryDrivers", data.driverId)
          );
          if (dr.exists()) driverName = dr.data().name;
        }

        list.push({
          id: d.id,
          pumpCodes: data.pumpCodes || [],
          status: data.status,
          pharmacyName,
          driverName,
          hasReturn: data.hasReturn || false,
          deliveredAt: data.deliveredAt,
        });
      }

      setDeliveries(list);
    });

    return () => unsub();
  }, [router]);

  const confirmReceived = async (id: string) => {
    await updateDoc(doc(db, "deliveries", id), {
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

      <h1 className="text-2xl font-bold mb-6">My Pumps</h1>

      {deliveries.length === 0 && (
        <p className="text-gray-500">No pumps assigned.</p>
      )}

      <div className="space-y-4">
        {deliveries.map((d) => (
          <div
            key={d.id}
            className="border rounded-lg p-5 bg-white shadow"
          >
            <p className="font-semibold mb-2">Pump Codes:</p>
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
                className="mt-3 bg-green-600 text-white px-4 py-2 rounded"
              >
                I received the pumps
              </button>
            )}

            {d.status === "received_by_client" && !d.hasReturn && (
              <button
                onClick={() =>
                  router.push(`/client/return/${d.id}`)
                }
                className="mt-3 bg-yellow-600 text-white px-4 py-2 rounded"
              >
                Return pumps
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
