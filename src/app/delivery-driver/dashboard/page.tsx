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

/* =======================
   Types
======================= */
type Delivery = {
  id: string;
  deliveryAddress?: string;
  pumpCodes: string[];
  status: string;
  clientId: string;
  pharmacyId: string;
  driverId?: string | null;
  clientName?: string;
  clientPhone?: string;
};

export default function DriverDashboard() {
  const router = useRouter();

  const [available, setAvailable] = useState<Delivery[]>([]);
  const [assigned, setAssigned] = useState<Delivery[]>([]);

  const driverId =
    typeof window !== "undefined"
      ? localStorage.getItem("driverId")
      : null;

  /* =======================
     AUTH
  ======================= */
  useEffect(() => {
    if (!driverId) {
      router.push("/delivery-driver/login");
    }
  }, [driverId, router]);

  /* =======================
     AVAILABLE DELIVERIES
     (driverId === null)
  ======================= */
  useEffect(() => {
    const q = query(
      collection(db, "deliveries"),
      where("driverId", "==", null)
    );

    const unsub = onSnapshot(q, async (snap) => {
      const list = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();

          let clientName = "Unknown";
          let clientPhone: string | undefined;

          try {
            const clientSnap = await getDoc(
              doc(db, "clients", data.clientId)
            );
            if (clientSnap.exists()) {
              clientName = clientSnap.data().name;
              clientPhone = clientSnap.data().phone;
            }
          } catch {}

          return {
            id: d.id,
            ...data,
            clientName,
            clientPhone,
          } as Delivery;
        })
      );

      setAvailable(list);
    });

    return () => unsub();
  }, []);

  /* =======================
     ASSIGNED DELIVERIES
     (driverId === me)
  ======================= */
  useEffect(() => {
    if (!driverId) return;

    const q = query(
      collection(db, "deliveries"),
      where("driverId", "==", driverId)
    );

    const unsub = onSnapshot(q, async (snap) => {
      const list = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();

          let clientName = "Unknown";
          let clientPhone: string | undefined;

          try {
            const clientSnap = await getDoc(
              doc(db, "clients", data.clientId)
            );
            if (clientSnap.exists()) {
              clientName = clientSnap.data().name;
              clientPhone = clientSnap.data().phone;
            }
          } catch {}

          return {
            id: d.id,
            ...data,
            clientName,
            clientPhone,
          } as Delivery;
        })
      );

      setAssigned(list);
    });

    return () => unsub();
  }, [driverId]);

  /* =======================
     ACCEPT DELIVERY
  ======================= */
  const acceptDelivery = async (d: Delivery) => {
    if (!driverId) return;

    await updateDoc(doc(db, "deliveries", d.id), {
      driverId,
      status: "assigned",
      updatedAt: serverTimestamp(),
    });

    // 🔔 Notify pharmacy
    await addDoc(collection(db, "notifications"), {
      userId: d.pharmacyId,
      role: "pharmacy",
      title: "Delivery assigned",
      message: "A driver has accepted the delivery.",
      deliveryId: d.id,
      read: false,
      createdAt: serverTimestamp(),
    });

    // 🔔 Notify client
    await addDoc(collection(db, "notifications"), {
      userId: d.clientId,
      role: "client",
      title: "Driver assigned",
      message: "Your delivery has been assigned to a driver.",
      deliveryId: d.id,
      read: false,
      createdAt: serverTimestamp(),
    });
  };

  /* =======================
     UPDATE STATUS
  ======================= */
  const updateStatus = async (
    d: Delivery,
    status: string
  ) => {
    await updateDoc(doc(db, "deliveries", d.id), {
      status,
      updatedAt: serverTimestamp(),
    });

    // 🔔 Notify client + pharmacy
    for (const role of ["client", "pharmacy"] as const) {
      await addDoc(collection(db, "notifications"), {
        userId:
          role === "client"
            ? d.clientId
            : d.pharmacyId,
        role,
        title: "Delivery update",
        message: `Status updated to: ${status}`,
        deliveryId: d.id,
        read: false,
        createdAt: serverTimestamp(),
      });
    }
  };

  /* =======================
     UI
  ======================= */
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-10">

      {/* 🔙 TOP NAV */}
      <div className="flex justify-between text-sm">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-blue-600 hover:underline"
        >
          ← Back to menu
        </button>

        <span className="text-gray-600 font-medium">
          Driver Panel
        </span>
      </div>

      <h1 className="text-2xl font-bold">
        Driver Dashboard
      </h1>

      {/* =======================
          AVAILABLE DELIVERIES
      ======================= */}
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
          <div
            key={d.id}
            className="border p-4 rounded mb-3 bg-white"
          >
            <p>
              <strong>Client:</strong>{" "}
              {d.clientName}
            </p>

            {d.clientPhone && (
              <p>
                <strong>Phone:</strong>{" "}
                {d.clientPhone}
              </p>
            )}

            <p>
              <strong>Address:</strong>{" "}
              {d.deliveryAddress}
            </p>

            <p className="text-sm mt-1">
              <strong>Pumps:</strong>{" "}
              {d.pumpCodes.join(", ")}
            </p>

            <button
              onClick={() => acceptDelivery(d)}
              className="mt-3 bg-blue-600 text-white px-4 py-1 rounded"
            >
              Accept Delivery
            </button>
          </div>
        ))}
      </section>

      {/* =======================
          MY DELIVERIES
      ======================= */}
      <section>
        <h2 className="text-xl font-semibold mb-3">
          My Deliveries
        </h2>

        {assigned.length === 0 && (
          <p className="text-gray-500">
            No assigned deliveries.
          </p>
        )}

        {assigned.map((d) => (
          <div
            key={d.id}
            className="border p-4 rounded mb-3 bg-white"
          >
            <p>
              <strong>Client:</strong>{" "}
              {d.clientName}
            </p>

            <p>
              <strong>Status:</strong>{" "}
              {d.status}
            </p>

            {/* STATUS FLOW */}
            {d.status === "assigned" && (
              <button
                onClick={() =>
                  updateStatus(d, "picked_up")
                }
                className="mt-2 bg-blue-500 text-white px-3 py-1 rounded"
              >
                Picked Up
              </button>
            )}

            {d.status === "picked_up" && (
              <button
                onClick={() =>
                  updateStatus(d, "on_route")
                }
                className="mt-2 bg-orange-500 text-white px-3 py-1 rounded"
              >
                On Route
              </button>
            )}

            {d.status === "on_route" && (
              <button
                onClick={() =>
                  updateStatus(d, "delivered")
                }
                className="mt-2 bg-green-600 text-white px-3 py-1 rounded"
              >
                Delivered
              </button>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
