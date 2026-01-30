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
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

type ReturnDelivery = {
  id: string;
  pumpCodes: string[];
  status: string;
  clientId: string;
  pharmacyId: string;
  driverId?: string;
  clientName?: string;
  clientPhone?: string;
};

export default function PharmacyReturnsPage() {
  const [returns, setReturns] = useState<ReturnDelivery[]>([]);
  const router = useRouter();

  /* =======================
     AUTH + LOAD RETURNS
  ======================= */
  useEffect(() => {
    const stored = localStorage.getItem("pharmacy");

    if (!stored) {
      router.push("/pharmacy/login");
      return;
    }

    const pharmacy = JSON.parse(stored);

    const q = query(
      collection(db, "deliveries"),
      where("type", "==", "return"),
      where("pharmacyId", "==", pharmacy.id)
    );

    const unsub = onSnapshot(q, async (snap) => {
      const list = await Promise.all(
        snap.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }))
          // ⛔ solo ocultar cuando ya fue confirmado
          .filter(
            (d) => d.status !== "received_by_pharmacy"
          )
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

      setReturns(list);
    });

    return () => unsub();
  }, [router]);

  /* =======================
     CONFIRM RECEPTION
  ======================= */
  const confirmReception = async (
    delivery: ReturnDelivery
  ) => {
    // ✅ cerrar flujo
    await updateDoc(
      doc(db, "deliveries", delivery.id),
      {
        status: "received_by_pharmacy",
        receivedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    );

    // 🔔 Notify client
    await addDoc(collection(db, "notifications"), {
      userId: delivery.clientId,
      role: "client",
      title: "Return completed",
      message:
        "Your pump return has been successfully received by the pharmacy.",
      deliveryId: delivery.id,
      read: false,
      createdAt: serverTimestamp(),
    });

    // 🔔 Notify driver
    if (delivery.driverId) {
      await addDoc(collection(db, "notifications"), {
        userId: delivery.driverId,
        role: "driver",
        title: "Return confirmed",
        message:
          "The pharmacy has confirmed the return.",
        deliveryId: delivery.id,
        read: false,
        createdAt: serverTimestamp(),
      });
    }
  };

  /* =======================
     UI
  ======================= */
  return (
    <div className="max-w-4xl mx-auto p-6">
      <button
        onClick={() => router.back()}
        className="text-blue-600 hover:underline mb-6"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold mb-6">
        Return Confirmations
      </h1>

      {returns.length === 0 && (
        <p className="text-gray-500">
          No returns pending confirmation.
        </p>
      )}

      <div className="space-y-4">
        {returns.map((r) => (
          <div
            key={r.id}
            className="border rounded-lg p-4 bg-white shadow"
          >
            <p>
              <strong>Client:</strong>{" "}
              {r.clientName || "Unknown"}
            </p>

            {r.clientPhone && (
              <p>
                <strong>Phone:</strong>{" "}
                {r.clientPhone}
              </p>
            )}

            <p className="mt-2 font-semibold">
              Pump Codes:
            </p>
            <ul className="list-disc ml-5">
              {r.pumpCodes.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>

            <p className="mt-2">
              <strong>Status:</strong>{" "}
              <span className="font-semibold">
                {r.status}
              </span>
            </p>

            {/* ✅ CONFIRM BUTTON */}
            {r.status === "returned_to_pharmacy" && (
              <button
                onClick={() => confirmReception(r)}
                className="mt-4 bg-green-600 text-white px-4 py-2 rounded"
              >
                Confirm Reception
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
