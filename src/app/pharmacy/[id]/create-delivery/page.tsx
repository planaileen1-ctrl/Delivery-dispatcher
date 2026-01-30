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

export default function CreateDeliveryPage() {
  const router = useRouter();
  const params = useParams();

  const pharmacyId =
    (params.pharmacyId as string) ||
    (params.id as string);

  const [pharmacyName, setPharmacyName] = useState("");
  const [clients, setClients] = useState<Client[]>([]);

  const [clientId, setClientId] = useState("");
  const [address, setAddress] = useState("");
  const [pumpCodes, setPumpCodes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successOrder, setSuccessOrder] =
    useState<string | null>(null);

  /* =======================
     LOAD PHARMACY
  ======================= */
  useEffect(() => {
    if (!pharmacyId) return;

    getDoc(doc(db, "pharmacies", pharmacyId)).then(
      (snap) => {
        if (snap.exists()) {
          setPharmacyName(snap.data().name);
        }
      }
    );
  }, [pharmacyId]);

  /* =======================
     LOAD CLIENTS
  ======================= */
  useEffect(() => {
    if (!pharmacyId) return;

    const q = query(
      collection(db, "clients"),
      where("pharmacyId", "==", pharmacyId)
    );

    getDocs(q).then((snap) =>
      setClients(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name || "Unnamed client",
        }))
      )
    );
  }, [pharmacyId]);

  /* =======================
     GENERATE ORDER NUMBER
  ======================= */
  const generateOrderNumber = () => {
    const date = new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");
    const random = Math.floor(
      1000 + Math.random() * 9000
    );
    return `ORD-${date}-${random}`;
  };

  /* =======================
     SAVE DELIVERY
  ======================= */
  const handleSubmit = async () => {
    setError("");
    setSuccessOrder(null);

    if (!clientId || !address || !pumpCodes) {
      setError("All fields are required.");
      return;
    }

    setLoading(true);
    const orderNumber = generateOrderNumber();

    try {
      // ✅ CREATE DELIVERY (MAIN ACTION)
      const deliveryRef = await addDoc(
        collection(db, "deliveries"),
        {
          orderNumber,
          pharmacyId,
          clientId,
          driverId: null,
          deliveryAddress: address,
          pumpCodes: pumpCodes
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean),
          status: "created",
          createdAt: serverTimestamp(),
        }
      );

      setSuccessOrder(orderNumber);

      // 🔔 TRY NOTIFICATIONS (NON-BLOCKING)
      try {
        const driversSnap = await getDocs(
          collection(db, "deliveryDrivers")
        );

        for (const d of driversSnap.docs) {
          await addDoc(collection(db, "notifications"), {
            userId: d.id,
            role: "driver",
            title: "New delivery available",
            message: `Order ${orderNumber} is ready for pickup.`,
            deliveryId: deliveryRef.id,
            read: false,
            createdAt: serverTimestamp(),
          });
        }
      } catch (notifyErr) {
        console.warn(
          "Delivery saved, notifications failed",
          notifyErr
        );
      }

      // ✅ RESET FOR NEXT DELIVERY
      setClientId("");
      setAddress("");
      setPumpCodes("");
    } catch (err) {
      console.error(err);
      setError("Delivery could not be created.");
    } finally {
      setLoading(false);
    }
  };

  const selectedClient = clients.find(
    (c) => c.id === clientId
  );

  /* =======================
     UI
  ======================= */
  return (
    <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* FORM */}
      <div className="md:col-span-2">
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
          onChange={(e) =>
            setClientId(e.target.value)
          }
          className="w-full border p-2 mb-4"
        >
          <option value="">
            Select client
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* ADDRESS */}
        <label className="block mb-2 font-medium">
          Delivery Address
        </label>
        <input
          value={address}
          onChange={(e) =>
            setAddress(e.target.value)
          }
          className="w-full border p-2 mb-4"
        />

        {/* PUMPS */}
        <label className="block mb-2 font-medium">
          Pump Bar Codes
        </label>
        <input
          value={pumpCodes}
          onChange={(e) =>
            setPumpCodes(e.target.value)
          }
          placeholder="255, 286, 312"
          className="w-full border p-2 mb-6"
        />

        {error && (
          <p className="text-red-600 text-sm mb-4">
            {error}
          </p>
        )}

        {successOrder && (
          <p className="text-green-600 font-medium mb-4">
            Delivery created successfully. Order number:{" "}
            <strong>{successOrder}</strong>
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-purple-600 text-white py-3 rounded disabled:opacity-50"
        >
          {loading
            ? "Saving..."
            : "Create Delivery"}
        </button>
      </div>

      {/* PREVIEW */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <h2 className="font-semibold mb-3">
          Delivery Preview
        </h2>

        <p>
          <strong>Client:</strong>{" "}
          {selectedClient?.name || "-"}
        </p>
        <p>
          <strong>Address:</strong>{" "}
          {address || "-"}
        </p>
        <p className="mt-2 font-semibold">
          Pumps:
        </p>
        <ul className="list-disc ml-5">
          {pumpCodes
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean)
            .map((p, i) => (
              <li key={i}>{p}</li>
            ))}
        </ul>
      </div>
    </div>
  );
}
