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

const EMAIL_FUNCTION_URL =
  "https://us-central1-delivery-dispatcher-f11cc.cloudfunctions.net/sendEmail";

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
     AVAILABLE (SOLO CREATED)
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
     ASSIGNED TO ME
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
      setAssigned(list);
    });

    return () => unsub();
  }, [driverId]);

  /* =======================
     ACCEPT DELIVERY (SAFE)
  ======================= */
  const acceptDelivery = async (d: Delivery) => {
    if (!driverId) return;

    const ref = doc(db, "deliveries", d.id);
    const snap = await getDoc(ref);

    // 🚫 someone already took it
    if (!snap.exists()) return;

    const current = snap.data();
    if (
      current.status !== "created" ||
      current.driverId !== null
    ) {
      alert("This delivery was already taken.");
      return;
    }

    // ✅ lock delivery
    await updateDoc(ref, {
      driverId,
      status: "assigned",
      updatedAt: serverTimestamp(),
    });

    // 📲 notify client
    await addDoc(collection(db, "notifications"), {
      userId: d.clientId,
      role: "client",
      title: "Driver assigned",
      message: "A driver has accepted your delivery.",
      deliveryId: d.id,
      read: false,
      createdAt: serverTimestamp(),
    });

    // 📧 email client
    const clientSnap = await getDoc(
      doc(db, "clients", d.clientId)
    );

    if (clientSnap.exists()) {
      const client = clientSnap.data();
      if (client.email) {
        fetch(EMAIL_FUNCTION_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: client.email,
            subject: "Your delivery is on the way",
            text: `Hello ${client.name},

A driver has accepted your delivery.

Address: ${d.deliveryAddress}
Pumps: ${d.pumpCodes.join(", ")}

— notificationsglobal`,
          }),
        }).catch(() => {});
      }
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-10">
      <h1 className="text-2xl font-bold">
        Driver Dashboard
      </h1>

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
            className="border p-4 mb-3"
          >
            <p>
              <strong>Pharmacy:</strong>{" "}
              {d.pharmacyName}
            </p>
            <p>
              <strong>Client:</strong>{" "}
              {d.clientName}
            </p>
            <p>
              <strong>Address:</strong>{" "}
              {d.deliveryAddress}
            </p>
            <p>
              <strong>Pumps:</strong>{" "}
              {d.pumpCodes.join(", ")}
            </p>

            <button
              onClick={() => acceptDelivery(d)}
              className="mt-2 bg-blue-600 text-white px-4 py-1 rounded"
            >
              Accept Delivery
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
