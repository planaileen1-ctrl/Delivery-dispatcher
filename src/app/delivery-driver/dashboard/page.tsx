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
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

const EMAIL_FUNCTION_URL =
  "https://us-central1-delivery-dispatcher-f11cc.cloudfunctions.net/sendEmail";

/* =======================
   TYPES
======================= */
type Delivery = {
  id: string;
  deliveryAddress?: string;
  pumpCodes: string[];
  status: string;
  type?: "return";

  clientId: string;
  pharmacyId: string;
  driverId?: string | null;

  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;

  pharmacyName?: string;
  pharmacyPhone?: string;
  pharmacyEmail?: string;
};

/* =======================
   PAGE
======================= */
export default function DriverDashboard() {
  const router = useRouter();

  const [available, setAvailable] = useState<Delivery[]>([]);
  const [assigned, setAssigned] = useState<Delivery[]>([]);

  const driverId =
    typeof window !== "undefined"
      ? localStorage.getItem("driverId")
      : null;

  useEffect(() => {
    if (!driverId) {
      router.push("/delivery-driver/login");
    }
  }, [driverId, router]);

  /* =======================
     EMAIL HELPER
  ======================= */
  const sendEmail = (
    to?: string | null,
    subject?: string,
    text?: string
  ) => {
    if (!to || !subject || !text) return;

    fetch(EMAIL_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, text }),
    }).catch(() => {});
  };

  /* =======================
     ENRICH DELIVERY (FULL)
  ======================= */
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
        : "Unknown client",

      clientPhone: clientSnap.exists()
        ? clientSnap.data().phone
        : "N/A",

      clientEmail: clientSnap.exists()
        ? clientSnap.data().email
        : undefined,

      pharmacyName: pharmacySnap.exists()
        ? pharmacySnap.data().name
        : "Unknown pharmacy",

      pharmacyPhone: pharmacySnap.exists()
        ? pharmacySnap.data().whatsapp
        : "N/A",

      pharmacyEmail: pharmacySnap.exists()
        ? pharmacySnap.data().email
        : undefined,
    } as Delivery;
  };

  /* =======================
     AVAILABLE DELIVERIES
     ✅ CREATED + RETURN_REQUESTED
  ======================= */
  useEffect(() => {
    const q = query(
      collection(db, "deliveries"),
      where("driverId", "==", null),
      where("status", "in", ["created", "return_requested"])
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
     ACTIONS
  ======================= */
  const acceptDelivery = async (d: Delivery) => {
    await updateDoc(doc(db, "deliveries", d.id), {
      driverId,
      status: "assigned",
      updatedAt: serverTimestamp(),
    });

    // 📧 emails SOLO para pedidos normales
    if (!d.type) {
      sendEmail(
        d.clientEmail,
        "Driver assigned",
        `Your delivery is on the way.\nAddress: ${d.deliveryAddress}`
      );

      sendEmail(
        d.pharmacyEmail,
        "Delivery accepted",
        `Driver accepted the delivery for ${d.clientName}.`
      );
    }
  };

  const markPickedUp = async (d: Delivery) => {
    await updateDoc(doc(db, "deliveries", d.id), {
      status: "picked_up",
      pickedUpAt: serverTimestamp(),
    });
  };

  const markDelivered = async (d: Delivery) => {
    await updateDoc(doc(db, "deliveries", d.id), {
      status: d.type === "return"
        ? "returned_to_pharmacy"
        : "delivered",
      deliveredAt: serverTimestamp(),
    });
  };

  /* =======================
     UI
  ======================= */
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
            <p><strong>Client:</strong> {d.clientName}</p>
            <p><strong>Phone:</strong> {d.clientPhone}</p>
            <p><strong>Address:</strong> {d.deliveryAddress || "—"}</p>

            <p className="mt-2">
              <strong>Pharmacy:</strong> {d.pharmacyName}
            </p>
            <p><strong>Pharmacy Phone:</strong> {d.pharmacyPhone}</p>

            <p className="mt-2 text-sm">
              <strong>Pumps:</strong>{" "}
              {d.pumpCodes?.join(", ") || "N/A"}
            </p>

            {d.type === "return" && (
              <p className="mt-2 text-orange-600 font-semibold">
                🔄 Return pickup
              </p>
            )}

            <button
              onClick={() => acceptDelivery(d)}
              className="mt-3 bg-blue-600 text-white px-4 py-2 rounded"
            >
              Accept
            </button>
          </div>
        ))}
      </section>

      {/* ASSIGNED */}
      <section>
        <h2 className="text-xl font-semibold mb-3">
          My Active Deliveries
        </h2>

        {assigned.map((d) => (
          <div key={d.id} className="border p-4 mb-3 bg-gray-50">
            <p><strong>Client:</strong> {d.clientName}</p>
            <p><strong>Status:</strong> {d.status}</p>

            {d.status === "assigned" && (
              <button
                onClick={() => markPickedUp(d)}
                className="mt-2 bg-purple-600 text-white px-4 py-1 rounded"
              >
                Picked up
              </button>
            )}

            {d.status === "picked_up" && (
              <button
                onClick={() => markDelivered(d)}
                className="mt-2 bg-green-600 text-white px-4 py-1 rounded"
              >
                {d.type === "return"
                  ? "Return to pharmacy"
                  : "Mark as delivered"}
              </button>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
