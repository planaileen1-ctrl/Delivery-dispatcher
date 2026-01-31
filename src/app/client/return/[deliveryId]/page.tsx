// src/app/client/return/[deliveryId]/page.tsx
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
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* =======================
   TYPES
======================= */
type OriginalDelivery = {
  id: string;
  pumpCodes: string[];
  pharmacyId: string;
  clientId: string;
  deliveredAt?: Timestamp;
};

export default function ReturnPumpsPage() {
  const { deliveryId } = useParams();
  const router = useRouter();

  const [delivery, setDelivery] =
    useState<OriginalDelivery | null>(null);

  const [selectedPumps, setSelectedPumps] = useState<string[]>([]);
  const [extraPumps, setExtraPumps] = useState("");
  const [missingReason, setMissingReason] = useState("");
  const [checking, setChecking] = useState(false);

  /* =======================
     LOAD ORIGINAL DELIVERY
     + BLOCK DUPLICATE RETURN
  ======================= */
  useEffect(() => {
    const load = async () => {
      const snap = await getDoc(
        doc(db, "deliveries", deliveryId as string)
      );

      if (!snap.exists()) return;

      // ⛔ bloquear si ya existe retorno
      const q = query(
        collection(db, "deliveries"),
        where("type", "==", "return"),
        where("originalDeliveryId", "==", snap.id)
      );

      const existingReturn = await getDocs(q);
      if (!existingReturn.empty) {
        router.push("/client/dashboard");
        return;
      }

      const data = {
        id: snap.id,
        ...(snap.data() as Omit<OriginalDelivery, "id">),
      };

      setDelivery(data);
      setSelectedPumps(data.pumpCodes || []);
    };

    load();
  }, [deliveryId, router]);

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
      if (!snap.empty) return pump;
    }
    return null;
  };

  /* =======================
     SUBMIT RETURN
     + AUTO NOTIFY DRIVERS
  ======================= */
  const submitReturn = async () => {
    if (!delivery) return;

    const extraPumpList = extraPumps
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    if (
      selectedPumps.length < delivery.pumpCodes.length &&
      !missingReason
    ) {
      alert("Reason is required for missing pumps.");
      return;
    }

    setChecking(true);

    const duplicatedPump = await verifyExtraPumps(extraPumpList);
    if (duplicatedPump) {
      alert(`Pump ${duplicatedPump} already exists.`);
      setChecking(false);
      return;
    }

    const finalPumpCodes = [
      ...selectedPumps,
      ...extraPumpList,
    ];

    const returnRef = await addDoc(
      collection(db, "deliveries"),
      {
        type: "return",
        originalDeliveryId: delivery.id,

        pharmacyId: delivery.pharmacyId,
        clientId: delivery.clientId,
        driverId: null,

        pumpCodes: finalPumpCodes,

        deliveryInfo: {
          deliveredAt: delivery.deliveredAt || null,
        },

        missingPumpsInfo:
          selectedPumps.length < delivery.pumpCodes.length
            ? {
                missing: delivery.pumpCodes.filter(
                  (p) => !selectedPumps.includes(p)
                ),
                reason: missingReason,
              }
            : null,

        status: "return_requested",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    );

    // 🔔 notify pharmacy
    await addDoc(collection(db, "notifications"), {
      userId: delivery.pharmacyId,
      role: "pharmacy",
      title: "New return requested",
      message: "A client requested a pump return.",
      deliveryId: returnRef.id,
      read: false,
      createdAt: serverTimestamp(),
    });

    // 🔔 notify ALL drivers automatically
    const driversSnap = await getDocs(
      collection(db, "deliveryDrivers")
    );

    for (const d of driversSnap.docs) {
      await addDoc(collection(db, "notifications"), {
        userId: d.id,
        role: "driver",
        title: "New return available",
        message:
          "A pump return is ready for pickup.",
        deliveryId: returnRef.id,
        read: false,
        createdAt: serverTimestamp(),
      });
    }

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

      <p className="text-sm mb-4 text-gray-600">
        Delivered at:{" "}
        {delivery.deliveredAt
          ? delivery.deliveredAt.toDate().toLocaleString()
          : "—"}
      </p>

      <p className="font-semibold mb-2">
        Pumps received:
      </p>

      <ul className="space-y-2 mb-4">
        {delivery.pumpCodes.map((p) => (
          <li key={p} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedPumps.includes(p)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedPumps([...selectedPumps, p]);
                } else {
                  setSelectedPumps(
                    selectedPumps.filter((x) => x !== p)
                  );
                }
              }}
            />
            <span>{p}</span>
          </li>
        ))}
      </ul>

      {selectedPumps.length <
        delivery.pumpCodes.length && (
        <div className="mb-6">
          <textarea
            placeholder="Reason for missing pumps"
            value={missingReason}
            onChange={(e) => setMissingReason(e.target.value)}
            className="w-full border p-2"
          />
        </div>
      )}

      <label className="block font-medium mb-2">
        Add extra pumps (optional)
      </label>
      <input
        value={extraPumps}
        onChange={(e) => setExtraPumps(e.target.value)}
        placeholder="284, 150"
        className="w-full border p-2 mb-6"
      />

      <button
        onClick={submitReturn}
        disabled={checking}
        className="w-full bg-yellow-600 text-white py-3 rounded disabled:opacity-50"
      >
        {checking ? "Checking..." : "Confirm Return"}
      </button>
    </div>
  );
}
