"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* =======================
   Types
======================= */
type Delivery = {
  id: string;
  orderNumber: string;
  deliveryAddress: string;
  pumpCodes: string[];
  status: string;
  createdAt?: Timestamp;
};

export default function ClientHistoryPage() {
  const params = useParams();
  const pharmacyId = params.id as string;
  const clientId = params.clientId as string;

  const router = useRouter();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  /* =======================
     LOAD HISTORY
  ======================= */
  useEffect(() => {
    if (!clientId) return;

    const q = query(
      collection(db, "deliveries"),
      where("clientId", "==", clientId),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: Delivery[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Delivery, "id">),
      }));

      setDeliveries(list);
      setLoading(false);
    });

    return () => unsub();
  }, [clientId]);

  /* =======================
     HELPERS
  ======================= */
  const formatDate = (ts?: Timestamp) => {
    if (!ts) return "-";
    return ts.toDate().toLocaleString();
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "created":
        return "text-blue-600";
      case "assigned":
        return "text-orange-600";
      case "delivered":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  /* =======================
     UI
  ======================= */
  return (
    <div className="max-w-6xl mx-auto p-6">
      <button
        onClick={() =>
          router.push(`/pharmacy/${pharmacyId}/clients`)
        }
        className="text-blue-600 hover:underline mb-6"
      >
        ← Back to clients
      </button>

      <h1 className="text-2xl font-bold mb-6">
        Client Delivery History
      </h1>

      {loading ? (
        <p>Loading history...</p>
      ) : deliveries.length === 0 ? (
        <p className="text-gray-600">
          This client has no deliveries yet.
        </p>
      ) : (
        <div className="space-y-6">
          {deliveries.map((d) => (
            <div
              key={d.id}
              className="border rounded-lg p-4 bg-white shadow-sm"
            >
              {/* HEADER */}
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-semibold">
                  Order {d.orderNumber}
                </h2>
                <span
                  className={`text-sm font-medium ${statusColor(
                    d.status
                  )}`}
                >
                  {d.status.toUpperCase()}
                </span>
              </div>

              {/* META */}
              <p className="text-sm text-gray-600 mb-1">
                <strong>Date:</strong>{" "}
                {formatDate(d.createdAt)}
              </p>

              <p className="text-sm text-gray-600 mb-3">
                <strong>Address:</strong>{" "}
                {d.deliveryAddress}
              </p>

              {/* PUMPS */}
              <div>
                <p className="font-medium mb-1">
                  Pumps received:
                </p>
                {d.pumpCodes?.length ? (
                  <ul className="list-disc ml-5 text-sm">
                    {d.pumpCodes.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">
                    No pumps listed
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
