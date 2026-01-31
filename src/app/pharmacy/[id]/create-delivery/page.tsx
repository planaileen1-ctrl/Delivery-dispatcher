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
  email?: string;
  pin?: string;
};

type Driver = {
  id: string;
  email?: string;
};

const EMAIL_FUNCTION_URL =
  "https://us-central1-delivery-dispatcher-f11cc.cloudfunctions.net/sendEmail";

export default function CreateDeliveryPage() {
  const router = useRouter();
  const params = useParams();

  const pharmacyId =
    (params.pharmacyId as string) ||
    (params.id as string);

  const [pharmacyName, setPharmacyName] = useState("");
  const [clients, setClients] = useState<Client[]>([]);

  const [clientId, setClientId] = useState("");
  const [selectedClient, setSelectedClient] =
    useState<Client | null>(null);

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
          email: d.data().email || "",
          pin: d.data().pin || "",
        }))
      )
    );
  }, [pharmacyId]);

  /* =======================
     LOAD SELECTED CLIENT
  ======================= */
  useEffect(() => {
    if (!clientId) {
      setSelectedClient(null);
      return;
    }

    getDoc(doc(db, "clients", clientId)).then((snap) => {
      if (snap.exists()) {
        setSelectedClient({
          id: snap.id,
          ...(snap.data() as Omit<Client, "id">),
        });
      }
    });
  }, [clientId]);

  /* =======================
     GENERATE ORDER NUMBER
  ======================= */
  const generateOrderNumber = () => {
    const date = new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");
    const random = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${date}-${random}`;
  };

  /* =======================
     SAVE DELIVERY
  ======================= */
  const handleSubmit = async () => {
    setError("");
    setSuccessOrder(null);

    if (!selectedClient || !address || !pumpCodes) {
      setError("All fields are required.");
      return;
    }

    setLoading(true);
    const orderNumber = generateOrderNumber();

    try {
      const deliveryRef = await addDoc(
        collection(db, "deliveries"),
        {
          orderNumber,
          pharmacyId,
          clientId: selectedClient.id,
          clientSnapshot: {
            name: selectedClient.name,
            email: selectedClient.email || "",
            pin: selectedClient.pin || "",
          },
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

      /* =======================
         NOTIFY DRIVERS (APP + EMAIL)
      ======================= */
      const driversSnap = await getDocs(
        collection(db, "deliveryDrivers")
      );

      for (const d of driversSnap.docs) {
        const driver = {
          id: d.id,
          email: d.data().email,
        } as Driver;

        // In-app notification
        await addDoc(collection(db, "notifications"), {
          userId: driver.id,
          role: "driver",
          title: "New delivery available",
          message: `Order ${orderNumber} is ready for pickup.`,
          deliveryId: deliveryRef.id,
          read: false,
          createdAt: serverTimestamp(),
        });

        // Email notification
        if (driver.email) {
          fetch(EMAIL_FUNCTION_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: driver.email,
              subject: "New delivery available",
              text: `A new delivery is available.

Order: ${orderNumber}
Address: ${address}
Pumps: ${pumpCodes}

— notificationsglobal`,
            }),
          }).catch(() => {});
        }
      }

      setClientId("");
      setSelectedClient(null);
      setAddress("");
      setPumpCodes("");
    } catch (err) {
      console.error(err);
      setError("Delivery could not be created.");
    } finally {
      setLoading(false);
    }
  };

  /* =======================
     UI (SIN CAMBIOS)
  ======================= */
  return (
    <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* FORM */}
      <div className="md:col-span-2">
        <div className="flex justify-between text-sm mb-6">
          <button
            onClick={() => router.push(`/pharmacy/${pharmacyId}`)}
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
          className="w-full border p-2 mb-2"
        >
          <option value="">Select client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {selectedClient && (
          <div className="bg-gray-50 border rounded p-3 mb-4 text-sm">
            <p><strong>Name:</strong> {selectedClient.name}</p>
            <p><strong>Email:</strong> {selectedClient.email || "-"}</p>
            <p><strong>PIN:</strong> {selectedClient.pin || "-"}</p>
          </div>
        )}

        <label className="block mb-2 font-medium">
          Delivery Address
        </label>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full border p-2 mb-4"
        />

        <label className="block mb-2 font-medium">
          Pump Bar Codes
        </label>
        <input
          value={pumpCodes}
          onChange={(e) => setPumpCodes(e.target.value)}
          className="w-full border p-2 mb-6"
        />

        {error && <p className="text-red-600 mb-4">{error}</p>}
        {successOrder && (
          <p className="text-green-600 mb-4">
            Order created: <strong>{successOrder}</strong>
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-purple-600 text-white py-3 rounded"
        >
          {loading ? "Saving..." : "Create Delivery"}
        </button>
      </div>
    </div>
  );
}
