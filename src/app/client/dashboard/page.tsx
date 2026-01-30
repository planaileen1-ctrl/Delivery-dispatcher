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
      where("clientId", "==", client.id)
    );

    const unsub = onSnapshot(q, async (snap) => {
      const result: DeliveryUI[] = [];

      for (const d of snap.docs) {
        const delivery = d.data();

        // 🔎 farmacia
        let pharmacyName = "—";
        if (delivery.pharmacyId) {
          const phRef = doc(
            db,
            "pharmacies",
            delivery.pharmacyId
          );
          const phSnap = await getDoc(phRef);

          if (phSnap.exists()) {
            pharmacyName = phSnap.data().name;
          } else {
            console.warn(
              "Pharmacy not found:",
              delivery.pharmacyId
            );
          }
        }

        // 🔎 conductor
        let driverName = "—";
        if (delivery.driverId) {
          const drRef = doc(
            db,
            "deliveryDrivers",
            delivery.driverId
          );
          const drSnap = await getDoc(drRef);

          if (drSnap.exists()) {
            driverName = drSnap.data().name;
          } else {
            console.warn(
              "Driver not found:",
              delivery.driverId
            );
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
        });
      }

      setDeliveries(result);
    });

    return () => unsub();
  }, [router]);

  const confirmReceived = async (deliveryId: string) => {
    await updateDoc(
      doc(db, "deliveries", deliveryId),
      {
        status: "received_by_client",
        receivedAt: new Date(),
      }
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* 🔙 BACK */}
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

            <p>
              <strong>Pharmacy:</strong>{" "}
              {d.pharmacyName}
            </p>

            <p>
              <strong>Driver:</strong>{" "}
              {d.driverName}
            </p>

            {d.createdAt && (
              <p>
                <strong>Sent at:</strong>{" "}
                {d.createdAt
                  .toDate()
                  .toLocaleString()}
              </p>
            )}

            {d.receivedAt && (
              <p>
                <strong>Received at:</strong>{" "}
                {d.receivedAt
                  .toDate()
                  .toLocaleString()}
              </p>
            )}

            <p className="mt-2">
              <strong>Status:</strong>{" "}
              {d.status}
            </p>

            {d.status === "delivered" && (
              <button
                onClick={() =>
                  confirmReceived(d.id)
                }
                className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                I received the pumps
              </button>
            )}

            {d.status === "received_by_client" && (
              <p className="mt-4 text-green-700 font-semibold">
                ✔ Reception confirmed
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
