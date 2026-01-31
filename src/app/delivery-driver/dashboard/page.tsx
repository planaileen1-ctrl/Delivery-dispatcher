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

type Delivery = {
  id: string;
  deliveryAddress?: string;
  pumpCodes: string[];
  status: string;
  clientId: string;
  pharmacyId: string;
  driverId?: string | null;
  clientName?: string;
  pharmacyName?: string;
};

export default function DriverDashboard() {
  const router = useRouter();

  const [available, setAvailable] = useState<Delivery[]>([]);
  const [assigned, setAssigned] = useState<Delivery[]>([]);

  const driverId =
    typeof window !== "undefined"
      ? localStorage.getItem("driverId")
      : null;

  useEffect(() => {
    if (!driverId) router.push("/delivery-driver/login");
  }, [driverId, router]);

  const enrichDelivery = async (d: any, id: string) => {
    const clientSnap = await getDoc(doc(db, "clients", d.clientId));
    const pharmacySnap = await getDoc(
      doc(db, "pharmacies", d.pharmacyId)
    );

    return {
      id,
      ...d,
      clientName: clientSnap.exists()
        ? clientSnap.data().name
        : "Unknown",
      pharmacyName: pharmacySnap.exists()
        ? pharmacySnap.data().name
        : "Unknown pharmacy",
    } as Delivery;
  };

  /* =======================
     AVAILABLE (CREATED)
  ======================= */
  useEffect(() => {
    const q = query(
      collection(db, "deliveries"),
      where("status", "==", "created"),
      where("driverId", "==", null)
    );

    const unsub = onSnapshot(q, async (snap) => {
      const list = await Promise.all(
        snap.docs.map((d) =>
          enrichDelivery(d.data(), d.id)
        )
      );
      setAvailable(list);
    });

    return () => unsub();
  }, []);

  /* =======================
     ASSIGNED TO ME (FIXED)
  ======================= */
  useEffect(() => {
    if (!driverId) return;

    const q = query(
      collection(db, "deliveries"),
      where("driverId", "==", driverId)
    );

    const unsub = onSnapshot(q, async (snap) => {
      const list = await Promise.all(
        snap.docs.map((d) =>
          enrichDelivery(d.data(), d.id)
        )
      );

      // 🔥 filtrar aquí, NO en Firestore
      setAssigned(
        list.filter(
          (d) =>
            d.status === "assigned" ||
            d.status === "picked_up"
        )
      );
    });

    return () => unsub();
  }, [driverId]);

  /* =======================
     ACCEPT DELIVERY
  ======================= */
  const acceptDelivery = async (d: Delivery) => {
    if (!driverId) return;

    const ref = doc(db, "deliveries", d.id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    if (snap.data().status !== "created") return;

    await updateDoc(ref, {
      driverId,
      status: "assigned",
      updatedAt: serverTimestamp(),
    });

    await addDoc(collection(db, "notifications"), {
      userId: d.clientId,
      role: "client",
      title: "Driver assigned",
      message: "The driver has accepted your delivery.",
      deliveryId: d.id,
      read: false,
      createdAt: serverTimestamp(),
    });
  };

  const markPickedUp = async (d: Delivery) => {
    await updateDoc(doc(db, "deliveries", d.id), {
      status: "picked_up",
      pickedUpAt: serverTimestamp(),
    });
  };

  const markDelivered = async (d: Delivery) => {
    await updateDoc(doc(db, "deliveries", d.id), {
      status: "delivered",
      deliveredAt: serverTimestamp(),
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-10">
      <h1 className="text-2xl font-bold">
        Driver Dashboard
      </h1>

      {/* AVAILABLE */}
      <section>
        <h2 className="text-xl font-semibold mb-3">
          Available Deliveries
        </h2>

        {available.length === 0 && (
          <p className="text-gray-500">
            No deliveries available.
          </p>
        )}

        {available.map((d) => (
          <div key={d.id} className="border p-4 mb-3">
            <p><strong>Pharmacy:</strong> {d.pharmacyName}</p>
            <p><strong>Client:</strong> {d.clientName}</p>
            <p><strong>Address:</strong> {d.deliveryAddress}</p>

            <button
              onClick={() => acceptDelivery(d)}
              className="mt-2 bg-blue-600 text-white px-4 py-1 rounded"
            >
              Accept Delivery
            </button>
          </div>
        ))}
      </section>

      {/* ASSIGNED */}
      <section>
        <h2 className="text-xl font-semibold mb-3">
          My Active Deliveries
        </h2>

        {assigned.length === 0 && (
          <p className="text-gray-500">
            No active deliveries.
          </p>
        )}

        {assigned.map((d) => (
          <div key={d.id} className="border p-4 mb-3 bg-gray-50">
            <p><strong>Client:</strong> {d.clientName}</p>
            <p><strong>Status:</strong> {d.status}</p>

            {d.status === "assigned" && (
              <button
                onClick={() => markPickedUp(d)}
                className="mt-2 bg-purple-600 text-white px-4 py-1 rounded"
              >
                Picked up order
              </button>
            )}

            {d.status === "picked_up" && (
              <button
                onClick={() => markDelivered(d)}
                className="mt-2 bg-green-600 text-white px-4 py-1 rounded"
              >
                Mark as delivered
              </button>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
