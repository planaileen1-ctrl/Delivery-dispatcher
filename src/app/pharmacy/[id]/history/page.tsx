"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  getDocs,
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
  returnedAt?: Date;
  returnDriverName?: string;
};

export default function DeliveryHistoryPage() {
  const { id: pharmacyId } = useParams();
  const router = useRouter();

  const [pharmacyName, setPharmacyName] = useState("");
  const [deliveries, setDeliveries] = useState<DeliveryUI[]>([]);
  const [loading, setLoading] = useState(true);

  /* 🔹 PHARMACY */
  useEffect(() => {
    const loadPharmacy = async () => {
      const snap = await getDoc(doc(db, "pharmacies", pharmacyId as string));
      if (snap.exists()) setPharmacyName(snap.data().name);
    };
    loadPharmacy();
  }, [pharmacyId]);

  /* 🔹 LOAD HISTORY */
  useEffect(() => {
    const load = async () => {
      const q = query(
        collection(db, "deliveries"),
        where("pharmacyId", "==", pharmacyId)
      );

      const snap = await getDocs(q);

      const base: Record<string, DeliveryUI> = {};
      const returns: any[] = [];

      // 1️⃣ split deliveries vs returns
      for (const d of snap.docs) {
        const data = d.data();

        if (data.type === "return") {
          returns.push({ id: d.id, ...data });
          continue;
        }

        const clientSnap = await getDoc(doc(db, "clients", data.clientId));
        const driverSnap = await getDoc(
          doc(db, "deliveryDrivers", data.driverId)
        );

        base[d.id] = {
          id: d.id,
          clientName: clientSnap.exists()
            ? clientSnap.data().name
            : "Unknown",
          driverName: driverSnap.exists()
            ? driverSnap.data().name
            : "Unknown",
          deliveryAddress: data.deliveryAddress,
          pumpCodes: data.pumpCodes || [],
          status: data.status,
          createdAt: data.createdAt?.toDate(),
        };
      }

      // 2️⃣ attach returns to original delivery
      for (const r of returns) {
        const originalId = r.originalDeliveryId;
        if (!originalId || !base[originalId]) continue;

        const returnDriverSnap = await getDoc(
          doc(db, "deliveryDrivers", r.driverId)
        );

        base[originalId].status = "returned";
        base[originalId].returnedAt = r.returnedAt?.toDate();
        base[originalId].returnDriverName = returnDriverSnap.exists()
          ? returnDriverSnap.data().name
          : "Unknown";
      }

      setDeliveries(Object.values(base));
      setLoading(false);
    };

    load();
  }, [pharmacyId]);

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* NAV */}
      <div className="flex justify-between mb-6 text-sm">
        <button
          onClick={() => router.push(`/pharmacy/${pharmacyId}`)}
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
                    Address: {d.deliveryAddress}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Pumps: {d.pumpCodes.join(", ")}
                  </p>

                  {d.status === "returned" && (
                    <p className="text-sm text-yellow-700 mt-2">
                      🔁 Returned by {d.returnDriverName} on{" "}
                      {d.returnedAt?.toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {d.createdAt?.toLocaleString()}
                  </p>
                  <span
                    className={`inline-block mt-2 px-3 py-1 text-xs rounded-full ${
                      d.status === "returned"
                        ? "bg-yellow-100 text-yellow-700"
                        : d.status === "delivered"
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
