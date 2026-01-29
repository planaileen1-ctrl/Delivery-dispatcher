"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function DriverDeliveryDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<string>("");

  // 🔹 Load delivery status
  useEffect(() => {
    const load = async () => {
      const snap = await getDoc(doc(db, "deliveries", id as string));
      if (snap.exists()) {
        setStatus(snap.data().status);
      }
    };
    load();
  }, [id]);

  // 🚚 MARK AS IN TRANSIT
  const markInTransit = async () => {
    await updateDoc(doc(db, "deliveries", id as string), {
      status: "in_transit",
    });

    setStatus("in_transit");
    alert("Delivery is now In Transit");
  };

  // ✅ CONFIRM DELIVERY WITH PIN
  const confirmDelivery = async () => {
    setError("");

    const stored = localStorage.getItem("driver");
    if (!stored) return;

    const driver = JSON.parse(stored);

    const snap = await getDoc(doc(db, "deliveryDrivers", driver.id));
    if (!snap.exists()) return;

    if (snap.data().pin !== pin) {
      setError("Invalid PIN");
      return;
    }

    await updateDoc(doc(db, "deliveries", id as string), {
      status: "delivered",
      deliveredAt: serverTimestamp(),
      deliveredBy: driver.id,
    });

    alert("Delivery confirmed successfully");
    router.push("/driver/deliveries");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow max-w-sm w-full">

        <h1 className="text-xl font-bold mb-4 text-center">
          Delivery Status
        </h1>

        <p className="text-center mb-6 font-semibold">
          Current status:{" "}
          <span className="uppercase">{status}</span>
        </p>

        {/* 🚚 IN TRANSIT */}
        {status === "created" && (
          <button
            onClick={markInTransit}
            className="w-full mb-4 bg-yellow-500 text-white py-3 rounded-lg hover:bg-yellow-600"
          >
            Mark as In Transit
          </button>
        )}

        {/* 🔐 CONFIRM DELIVERY */}
        {status === "in_transit" && (
          <>
            <input
              placeholder="Enter Driver PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-3 text-center tracking-widest"
            />

            {error && (
              <p className="text-red-600 text-sm mb-3 text-center">
                {error}
              </p>
            )}

            <button
              onClick={confirmDelivery}
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700"
            >
              Confirm Delivery
            </button>
          </>
        )}
      </div>
    </div>
  );
}
