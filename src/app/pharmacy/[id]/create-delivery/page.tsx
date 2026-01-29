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

type Client = {
  id: string;
  name: string;
};

type Driver = {
  id: string;
  name: string;
};

export default function CreateDeliveryPage() {
  const { id: pharmacyId } = useParams();
  const router = useRouter();

  const [pharmacyName, setPharmacyName] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const [clientId, setClientId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [address, setAddress] = useState("");
  const [pumpCodes, setPumpCodes] = useState("");

  /* 🔹 LOAD PHARMACY NAME */
  useEffect(() => {
    const loadPharmacy = async () => {
      const ref = doc(db, "pharmacies", pharmacyId as string);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setPharmacyName(snap.data().name);
      }
    };

    loadPharmacy();
  }, [pharmacyId]);

  /* 🔹 LOAD CLIENTS (ONLY THIS PHARMACY) */
  useEffect(() => {
    const loadClients = async () => {
      const q = query(
        collection(db, "clients"),
        where("pharmacyId", "==", pharmacyId)
      );
      const snap = await getDocs(q);
      setClients(
        snap.docs.map((d) => ({ id: d.id, name: d.data().name }))
      );
    };

    loadClients();
  }, [pharmacyId]);

  /* 🔹 LOAD DRIVERS (GLOBAL) */
  useEffect(() => {
    const loadDrivers = async () => {
      const snap = await getDocs(collection(db, "deliveryDrivers"));
      setDrivers(
        snap.docs.map((d) => ({ id: d.id, name: d.data().name }))
      );
    };

    loadDrivers();
  }, []);

  /* 🔹 SAVE DELIVERY */
  const handleSubmit = async () => {
    if (!clientId || !driverId || !address || !pumpCodes) {
      alert("All fields are required");
      return;
    }

    await addDoc(collection(db, "deliveries"), {
      pharmacyId,
      clientId,
      driverId,
      deliveryAddress: address,
      pumpCodes: pumpCodes.split(",").map((c) => c.trim()),
      status: "created",
      createdAt: serverTimestamp(),
    });

    alert("Delivery created successfully");
    router.push(`/pharmacy/${pharmacyId}`);
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      {/* 🔙 NAVIGATION */}
      <div className="flex justify-between text-sm mb-6">
        <button
          onClick={() => router.push(`/pharmacy/${pharmacyId}`)}
          className="text-blue-600 hover:underline"
        >
          ← Back to menu
        </button>

        <span className="text-gray-500 font-medium">
          {pharmacyName}
        </span>
      </div>

      <h1 className="text-2xl font-bold mb-6">
        Create Delivery
      </h1>

      {/* CLIENT */}
      <label className="block mb-2 font-medium">Client</label>
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
      <label className="block mb-2 font-medium">Driver</label>
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

      {/* BAR CODES */}
      <label className="block mb-2 font-medium">
        Pump Bar Codes (comma separated)
      </label>
      <input
        value={pumpCodes}
        onChange={(e) => setPumpCodes(e.target.value)}
        placeholder="PMP-001, PMP-002"
        className="w-full border p-2 mb-6"
      />

      <button
        onClick={handleSubmit}
        className="w-full bg-purple-600 text-white py-3 rounded"
      >
        Create Delivery
      </button>
    </div>
  );
}
