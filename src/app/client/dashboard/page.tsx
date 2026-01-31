"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  doc,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

/* =======================
   TYPES
======================= */
type DeliveryUI = {
  id: string;
  pumpCodes: string[];
  status: string;
  pharmacyName: string;
  driverName: string;
  canReturn: boolean;
};

export default function ClientDashboard() {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<DeliveryUI[]>([]);

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
      ])
    );

    const unsub = onSnapshot(q, async (snap) => {
      const result: DeliveryUI[] = [];

      for (const d of snap.docs) {
        const delivery = d.data();

        // ❌ no mostrar retornos
        if (delivery.type === "return") continue;

        // 🔒 verificar si ya existe retorno
        const returnQuery = query(
          collection(db, "deliveries"),
          where("type", "==", "return"),
          where("originalDeliveryId", "==", d.id)
        );
        const returnSnap = await getDocs(returnQuery);

        const canReturn =
          delivery.status === "delivered" &&
          returnSnap.empty;

        let pharmacyName = "—";
        if (delivery.pharmacyId) {
          const ph = await getDoc(
            doc(db, "pharmacies", delivery.pharmacyId)
          );
          if (ph.exists()) pharmacyName = ph.data().name;
        }

        let driverName = "—";
        if (delivery.driverId) {
          const dr = await getDoc(
            doc(db, "deliveryDrivers", delivery.driverId)
          );
          if (dr.exists()) driverName = dr.data().name;
        }

        result.push({
          id: d.id,
          pumpCodes: delivery.pumpCodes || [],
          status: delivery.status,
          pharmacyName,
          driverName,
          canReturn,
        });
      }

      setDeliveries(result);
    });

    return () => unsub();
  }, [router]);

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

            {d.canReturn && (
              <button
                onClick={() =>
                  router.push(`/client/return/${d.id}`)
                }
                className="mt-4 bg-yellow-600 text-white px-4 py-2 rounded"
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
