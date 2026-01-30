"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function ReturnPumpsPage() {
  const { deliveryId } = useParams();
  const router = useRouter();

  const [delivery, setDelivery] = useState<any>(null);
  const [extraPumps, setExtraPumps] = useState("");
  const [checking, setChecking] = useState(false);

  /* =======================
     LOAD ORIGINAL DELIVERY
  ======================= */
  useEffect(() => {
    const load = async () => {
      const snap = await getDoc(
        doc(db, "deliveries", deliveryId as string)
      );

      if (snap.exists()) {
        setDelivery({ id: snap.id, ...snap.data() });
      }
    };
    load();
  }, [deliveryId]);

  /* =======================
     VERIFY EXTRA PUMPS
  ======================= */
  const verifyExtraPumps = async (pumps: string[]) => {
    for (const pump of pumps) {
      const q = query(
        collection(db, "deliveries"),
        where("pumpCodes", "array-contains", pump)
      );

      const snap = await getDocs(q);
      if (!snap.empty) return pump; // ❌ duplicated
    }
    return null;
  };

  /* =======================
     SUBMIT RETURN
  ======================= */
  const submitReturn = async () => {
    if (!delivery) return;

    const extraPumpList = extraPumps
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    setChecking(true);

    // 🔍 VERIFY DUPLICATES
    const duplicatedPump = await verifyExtraPumps(extraPumpList);
    if (duplicatedPump) {
      alert(`Pump ${duplicatedPump} has already been sent before.`);
      setChecking(false);
      return;
    }

    // ✅ MERGE PUMPS
    const finalPumpCodes = [
      ...delivery.pumpCodes,
      ...extraPumpList,
    ];

    // 📦 CREATE RETURN DELIVERY
    const returnRef = await addDoc(
      collection(db, "deliveries"),
      {
        type: "return",
        originalDeliveryId: delivery.id,

        pharmacyId: delivery.pharmacyId,
        clientId: delivery.clientId,
        driverId: null, // assigned later

        pumpCodes: finalPumpCodes,

        status: "return_requested",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    );

    /* =======================
       NOTIFICATIONS
    ======================= */

    // 🔔 Notify pharmacy
    await addDoc(collection(db, "notifications"), {
      userId: delivery.pharmacyId,
      role: "pharmacy",
      title: "New return requested",
      message: "A client has requested a pump return.",
      deliveryId: returnRef.id,
      read: false,
      createdAt: serverTimestamp(),
    });

    // 🔔 Notify all drivers
    const driversSnap = await getDocs(
      collection(db, "deliveryDrivers")
    );

    for (const d of driversSnap.docs) {
      await addDoc(collection(db, "notifications"), {
        userId: d.id,
        role: "driver",
        title: "New return available",
        message: "A pump return is ready for pickup.",
        deliveryId: returnRef.id,
        read: false,
        createdAt: serverTimestamp(),
      });
    }

    alert("Return request sent successfully");
    router.push("/client/dashboard");
  };

  if (!delivery) return null;

  /* =======================
     UI
  ======================= */
  return (
    <div className="max-w-xl mx-auto p-6">
      <button
        onClick={() => router.back()}
        className="text-blue-600 hover:underline mb-6"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold mb-4">
        Return Pumps
      </h1>

      {/* ORIGINAL PUMPS */}
      <p className="font-semibold mb-2">
        Pumps received (mandatory):
      </p>
      <ul className="list-disc ml-5 mb-4">
        {delivery.pumpCodes.map((p: string) => (
          <li key={p}>{p}</li>
        ))}
      </ul>

      <p className="text-sm text-gray-600 mb-6">
        Received on:{" "}
        {delivery.receivedAt?.toDate().toLocaleString()}
      </p>

      {/* EXTRA PUMPS */}
      <label className="block font-medium mb-2">
        Add extra pumps (optional)
      </label>
      <input
        value={extraPumps}
        onChange={(e) => setExtraPumps(e.target.value)}
        placeholder="PMP-301, PMP-455"
        className="w-full border p-2 mb-6"
      />

      <button
        onClick={submitReturn}
        disabled={checking}
        className="w-full bg-yellow-600 text-white py-3 rounded disabled:opacity-50"
      >
        {checking ? "Checking pumps..." : "Confirm Return"}
      </button>
    </div>
  );
}
