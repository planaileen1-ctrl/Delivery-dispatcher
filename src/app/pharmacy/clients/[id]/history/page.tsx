"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type Delivery = {
  id: string;
  status: string;
  createdAt?: any;
  deliveredAt?: any;
  driverId?: string;
  address?: string;
};

export default function ClientHistoryPage() {
  const { id } = useParams(); // clientId
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [pharmacyName, setPharmacyName] = useState("");

  // 🔐 farmacia logueada
  const pharmacy =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("pharmacy") || "{}")
      : {};

  useEffect(() => {
    if (!pharmacy.id || !id) return;

    setPharmacyName(pharmacy.name);

    // 🔐 SOLO historial de ESTA farmacia
    const q = query(
      collection(db, "deliveries"),
      where("clientId", "==", id),
      where("pharmacyId", "==", pharmacy.id),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: Delivery[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Delivery, "id">),
      }));
      setDeliveries(list);
    });

    return () => unsub();
  }, [id, pharmacy.id]);

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">
            Client Delivery History
          </h1>
          <p className="text-sm text-gray-600">
            Pharmacy: <strong>{pharmacyName}</strong>
          </p>
        </div>

        <button
          onClick={() => router.push("/pharmacy/menu")}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Menu
        </button>
      </div>

      {/* LIST */}
      {deliveries.length === 0 ? (
        <p className="text-gray-500">
          No deliveries found for this client.
        </p>
      ) : (
        <div className="space-y-4">
          {deliveries.map((d) => (
            <div
              key={d.id}
              className="border rounded-xl p-4 bg-white shadow-sm"
            >
              <p className="font-semibold capitalize">
                Status: {d.status}
              </p>

              {d.address && (
                <p className="text-sm text-gray-600">
                  Address: {d.address}
                </p>
              )}

              {d.deliveredAt && (
                <p className="text-xs text-gray-500">
                  Delivered at:{" "}
                  {new Date(
                    d.deliveredAt.seconds * 1000
                  ).toLocaleString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
