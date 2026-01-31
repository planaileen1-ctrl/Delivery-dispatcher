"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type DeliveryUI = {
  id: string;
  clientName: string;
  driverName: string;
  deliveryAddress: string;
  pumpCodes: string[];
  status: string;
  createdAt?: Date;
};

export default function DeliveryHistoryPage() {
  const { id: pharmacyId } = useParams();
  const router = useRouter();

  const [pharmacyName, setPharmacyName] = useState("");
  const [deliveries, setDeliveries] = useState<DeliveryUI[]>([]);
  const [loading, setLoading] = useState(true);

  /* =======================
     LOAD PHARMACY
  ======================= */
  useEffect(() => {
    if (!pharmacyId) return;

    getDoc(doc(db, "pharmacies", pharmacyId as string))
      .then((snap) => {
        if (snap.exists()) {
          setPharmacyName(snap.data().name);
        }
      })
      .catch(console.error);
  }, [pharmacyId]);

  /* =======================
     LOAD HISTORY (REALTIME)
  ======================= */
  useEffect(() => {
    if (!pharmacyId) return;

    const q = query(
      collection(db, "deliveries"),
      where("pharmacyId", "==", pharmacyId)
    );

    const unsub = onSnapshot(
      q,
      async (snap) => {
        const result: DeliveryUI[] = [];

        for (const d of snap.docs) {
          const data = d.data();

          // 🧍 Client
          let clientName = "Unknown";
          try {
            const clientSnap = await getDoc(
              doc(db, "clients", data.clientId)
            );
            if (clientSnap.exists()) {
              clientName = clientSnap.data().name;
            }
          } catch {}

          // 🚚 Driver
          let driverName = "Unassigned";
          if (data.driverId) {
            try {
              const driverSnap = await getDoc(
                doc(
                  db,
                  "deliveryDrivers",
                  data.driverId
                )
              );
              if (driverSnap.exists()) {
                driverName =
                  driverSnap.data().name;
              }
            } catch {}
          }

          result.push({
            id: d.id,
            clientName,
            driverName,
            deliveryAddress:
              data.deliveryAddress,
            pumpCodes: data.pumpCodes || [],
            status: data.status,
            createdAt:
              data.createdAt?.toDate(),
          });
        }

        setDeliveries(result);
        setLoading(false);
      },
      (err) => {
        console.error("History realtime error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [pharmacyId]);

  /* =======================
     UI
  ======================= */
  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* NAV */}
      <div className="flex justify-between mb-6 text-sm">
        <button
          onClick={() =>
            router.push(`/pharmacy/${pharmacyId}`)
          }
          className="text-blue-600 hover:underline"
        >
          ← Back to menu
        </button>

        <span className="font-medium text-gray-600">
          {pharmacyName}
        </span>
      </div>

      <h1 className="text-3xl font-bold mb-8">
        Delivery History
      </h1>

      {loading ? (
        <p>Loading...</p>
      ) : deliveries.length === 0 ? (
        <p className="text-gray-500">
          No deliveries registered yet.
        </p>
      ) : (
        <div className="space-y-4">
          {deliveries.map((d) => (
            <div
              key={d.id}
              className="border rounded-xl p-5 bg-white shadow-sm"
            >
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold">
                    Client: {d.clientName}
                  </p>
                  <p className="text-sm text-gray-600">
                    Driver: {d.driverName}
                  </p>
                  <p className="text-sm">
                    Address:{" "}
                    {d.deliveryAddress}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Pumps:{" "}
                    {d.pumpCodes.join(", ")}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {d.createdAt?.toLocaleString()}
                  </p>
                  <span
                    className={`inline-block mt-2 px-3 py-1 text-xs rounded-full ${
                      d.status === "delivered"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {d.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
