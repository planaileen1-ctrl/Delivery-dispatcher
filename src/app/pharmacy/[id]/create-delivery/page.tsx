"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* =======================
   Types
======================= */
type Client = {
  id: string;
  name: string;
};

type Driver = {
  id: string;
  name: string;
};

export default function CreateDeliveryPage() {
  const router = useRouter();
  const params = useParams();

  // ✅ ROBUST pharmacyId
  const pharmacyId =
    (params.pharmacyId as string) ||
    (params.id as string);

  const [pharmacyName, setPharmacyName] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const [clientId, setClientId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [address, setAddress] = useState("");
  const [pumpCodes, setPumpCodes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* =======================
     LOAD PHARMACY NAME
  ======================= */
  useEffect(() => {
    if (!pharmacyId) return;

    const loadPharmacy = async () => {
      const ref = doc(db, "pharmacies", pharmacyId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setPharmacyName(snap.data().name);
      }
    };

    loadPharmacy();
  }, [pharmacyId]);

  /* =======================
     LOAD CLIENTS (BY PHARMACY)
  ======================= */
  useEffect(() => {
    if (!pharmacyId) return;

    const loadClients = async () => {
      const q = query(
        collection(db, "clients"),
        where("pharmacyId", "==", pharmacyId)
      );

      const snap = await getDocs(q);
      setClients(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name || "Unnamed client",
        }))
      );
    };

    loadClients();
  }, [pharmacyId]);

  /* =======================
     LOAD DRIVERS (GLOBAL)
  ======================= */
  useEffect(() => {
    const loadDrivers = async () => {
      const snap = await getDocs(
        collection(db, "deliveryDrivers")
      );

      setDrivers(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name || "Unnamed driver",
        }))
      );
    };

    loadDrivers();
  }, []);

  /* =======================
     SAVE DELIVERY
  ======================= */
  const handleSubmit = async () => {
    setError("");

    if (!pharmacyId) {
      setError("Pharmacy not detected. Check the URL.");
      return;
    }

    if (!clientId || !driverId || !address || !pumpCodes) {
      setError("All fields are required.");
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, "deliveries"), {
        pharmacyId,
        clientId,
        driverId,
        deliveryAddress: address,
        pumpCodes: pumpCodes
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
        status: "created",
        createdAt: serverTimestamp(),
      });

      // ✅ RESET FORM (KEEP PAGE)
      setClientId("");
      setDriverId("");
      setAddress("");
      setPumpCodes("");
    } catch (err) {
      console.error(err);
      setError("Error creating delivery");
    } finally {
      setLoading(false);
    }
  };

  /* =======================
     UI
  ======================= */
  return (
    <div className="max-w-xl mx-auto p-6">
      {/* 🔙 NAV */}
      <div className="flex justify-between text-sm mb-6">
        <button
          onClick={() =>
            router.push(`/pharmacy/${pharmacyId}`)
          }
          className="text-blue-600 hover:underline"
        >
          ← Back to menu
        </button>

        <span className="text-gray-600 font-medium">
          {pharmacyName}
        </span>
      </div>

      <h1 className="text-2xl font-bold mb-6">
        Create Delivery
      </h1>

      {/* CLIENT */}
      <label className="block mb-2 font-medium">
        Client
      </label>
      <select
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
        className="w-full border p-2 mb-4"
      >
        <option value="">Select client</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {/* DRIVER */}
      <label className="block mb-2 font-medium">
        Driver
      </label>
      <select
        value={driverId}
        onChange={(e) => setDriverId(e.target.value)}
        className="w-full border p-2 mb-4"
      >
        <option value="">Select driver</option>
        {drivers.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>

      {/* ADDRESS */}
      <label className="block mb-2 font-medium">
        Delivery Address
      </label>
      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        className="w-full border p-2 mb-4"
      />

      {/* PUMP CODES */}
      <label className="block mb-2 font-medium">
        Pump Bar Codes (comma separated)
      </label>
      <input
        value={pumpCodes}
        onChange={(e) => setPumpCodes(e.target.value)}
        placeholder="255, 286, 312"
        className="w-full border p-2 mb-6"
      />

      {error && (
        <p className="text-red-600 text-sm mb-4">
          {error}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-purple-600 text-white py-3 rounded disabled:opacity-50"
      >
        {loading ? "Saving..." : "Create Delivery"}
      </button>
    </div>
  );
}
