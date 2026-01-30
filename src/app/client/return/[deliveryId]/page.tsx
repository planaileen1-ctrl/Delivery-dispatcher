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

type Driver = {
  id: string;
  name: string;
};

export default function ReturnPumpsPage() {
  const { deliveryId } = useParams();
  const router = useRouter();

  const [delivery, setDelivery] = useState<any>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverId, setDriverId] = useState("");

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
     LOAD DRIVERS
  ======================= */
  useEffect(() => {
    const loadDrivers = async () => {
      const snap = await getDocs(
        collection(db, "deliveryDrivers")
      );
      setDrivers(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name,
        }))
      );
    };
    loadDrivers();
  }, []);

  /* =======================
     VERIFY EXTRA PUMPS
  ======================= */
  const verifyExtraPumps = async (
    pumps: string[]
  ) => {
    for (const pump of pumps) {
      const q = query(
        collection(db, "deliveries"),
        where("pumpCodes", "array-contains", pump)
      );

      const snap = await getDocs(q);

      if (!snap.empty) {
        return pump; // ❌ duplicated
      }
    }
    return null; // ✅ all good
  };

  /* =======================
     SUBMIT RETURN
  ======================= */
  const submitReturn = async () => {
    if (!driverId) {
      alert("Select a driver");
      return;
    }

    const extraPumpList = extraPumps
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    setChecking(true);

    // 🔍 VERIFY DUPLICATES
    const duplicatedPump =
      await verifyExtraPumps(extraPumpList);

    if (duplicatedPump) {
      alert(
        `Pump ${duplicatedPump} has already been sent before.`
      );
      setChecking(false);
      return;
    }

    // ✅ MERGE PUMPS
    const finalPumpCodes = [
      ...delivery.pumpCodes,
      ...extraPumpList,
    ];

    await addDoc(collection(db, "deliveries"), {
      type: "return",
      originalDeliveryId: delivery.id,

      pharmacyId: delivery.pharmacyId,
      clientId: delivery.clientId,
      driverId,

      pumpCodes: finalPumpCodes,

      originalReceivedAt: delivery.receivedAt,
      returnCreatedAt: serverTimestamp(),

      status: "return_created",
      createdAt: serverTimestamp(),
    });

    alert("Return created successfully");
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
        {delivery.receivedAt
          ?.toDate()
          .toLocaleString()}
      </p>

      {/* EXTRA PUMPS */}
      <label className="block font-medium mb-2">
        Add extra pumps (optional)
      </label>
      <input
        value={extraPumps}
        onChange={(e) =>
          setExtraPumps(e.target.value)
        }
        placeholder="PMP-301, PMP-455"
        className="w-full border p-2 mb-6"
      />

      {/* DRIVER */}
      <label className="block font-medium mb-2">
        Select driver
      </label>
      <select
        value={driverId}
        onChange={(e) =>
          setDriverId(e.target.value)
        }
        className="w-full border p-2 mb-6"
      >
        <option value="">
          Select driver
        </option>
        {drivers.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>

      <button
        onClick={submitReturn}
        disabled={checking}
        className="w-full bg-yellow-600 text-white py-3 rounded disabled:opacity-50"
      >
        {checking
          ? "Checking pumps..."
          : "Confirm Return"}
      </button>
    </div>
  );
}
