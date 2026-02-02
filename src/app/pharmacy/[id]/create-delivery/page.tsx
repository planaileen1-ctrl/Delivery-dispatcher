"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* =======================
   TYPES
======================= */
type Client = {
  id: string;
  name: string;
  email?: string;
};

type Pump = {
  id: string;
  code: string;
  status: string;
};

/* =======================
   HELPERS
======================= */
const generateOrderCode = () =>
  `DEL-${new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 14)}-${Math.floor(Math.random() * 9000 + 1000)}`;

const formatUSDate = () =>
  new Date().toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

/* =======================
   PAGE
======================= */
export default function CreateDeliveryPage() {
  const params = useParams();
  const pharmacyId = typeof params.id === "string" ? params.id : "";

  /* 🔑 EMPLOYEE */
  const employeeId = "EMP-001";
  const employeeName = "Andres";

  const [clients, setClients] = useState<Client[]>([]);
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedPumps, setSelectedPumps] = useState<Pump[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  /* 🔢 ORDER INFO */
  const [orderCode, setOrderCode] = useState(generateOrderCode());
  const [createdAtUS, setCreatedAtUS] = useState(formatUSDate());

  /* =======================
     LOAD PUMPS
  ======================= */
  const loadAvailablePumps = async () => {
    const pumpsSnap = await getDocs(
      query(
        collection(db, "pumps"),
        where("pharmacyId", "==", pharmacyId),
        where("status", "==", "available")
      )
    );

    setPumps(
      pumpsSnap.docs.map((d) => ({
        id: d.id,
        code: String(d.data().code),
        status: d.data().status,
      }))
    );
  };

  /* =======================
     LOAD DATA
  ======================= */
  useEffect(() => {
    if (!pharmacyId) return;

    const load = async () => {
      const clientsSnap = await getDocs(
        query(
          collection(db, "clients"),
          where("pharmacyId", "==", pharmacyId)
        )
      );

      setClients(
        clientsSnap.docs.map((d) => ({
          id: d.id,
          name: d.data().name,
          email: d.data().email,
        }))
      );

      await loadAvailablePumps();
    };

    load();
  }, [pharmacyId]);

  /* =======================
     AUTOCOMPLETE
  ======================= */
  const normalizedSearch = search.trim().toLowerCase();

  const filteredPumps =
    normalizedSearch.length === 0
      ? []
      : pumps.filter(
          (p) =>
            p.code.toLowerCase().includes(normalizedSearch) &&
            !selectedPumps.some((sp) => sp.id === p.id)
        );

  const addPump = (pump: Pump) => {
    setSelectedPumps((prev) => [...prev, pump]);
    setSearch("");
  };

  const removePump = (id: string) => {
    setSelectedPumps((prev) => prev.filter((p) => p.id !== id));
  };

  /* =======================
     SUBMIT
  ======================= */
  const createDelivery = async () => {
    if (!selectedClient || selectedPumps.length === 0) return;

    setLoading(true);

    try {
      const deliveryRef = await addDoc(collection(db, "deliveries"), {
        type: "delivery",
        orderCode,
        pharmacyId,

        clientId: selectedClient.id,
        clientEmail: selectedClient.email || null,

        createdByEmployeeId: employeeId,
        createdByEmployeeName: employeeName,

        pumps: selectedPumps.map((p) => ({
          pumpId: p.id,
          code: p.code,
        })),

        status: "pending",
        notifyClient: true,

        createdAtUS,
        createdAt: serverTimestamp(),
      });

      for (const p of selectedPumps) {
        await updateDoc(doc(db, "pumps", p.id), {
          status: "assigned",
          lastDeliveryId: deliveryRef.id,
        });
      }

      if (selectedClient.email) {
        await addDoc(collection(db, "notifications"), {
          type: "email",
          to: selectedClient.email,
          subject: "Your package is ready for delivery",
          text: `Hello ${selectedClient.name},

Your package with order number ${orderCode} is now ready.

A delivery driver will be assigned shortly and will deliver your order soon.

Thank you for choosing us.`,
          createdAt: serverTimestamp(),
        });
      }

      /* 🔁 RESET FOR NEXT DELIVERY */
      setSelectedPumps([]);
      setSelectedClient(null);
      setSearch("");
      setOrderCode(generateOrderCode());
      setCreatedAtUS(formatUSDate());
      await loadAvailablePumps();
    } catch (err: any) {
      console.error("❌ CREATE DELIVERY ERROR:", err);
      alert(
        err?.message ||
          "No se pudo crear el delivery. Revisa Firestore."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================
     UI
  ======================= */
  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <Link
        href={`/pharmacy/${pharmacyId}`}
        className="text-sm text-purple-600 hover:underline inline-block"
      >
        ← Back to menu
      </Link>

      <h1 className="text-2xl font-bold text-center">
        Create Delivery
      </h1>

      <div className="border rounded p-3 text-sm bg-gray-50">
        <p>
          <strong>Order:</strong> {orderCode}
        </p>
        <p>
          <strong>Created at:</strong> {createdAtUS}
        </p>
        <p>
          <strong>Employee:</strong> {employeeName}
        </p>
      </div>

      <select
        value={selectedClient?.id || ""}
        onChange={(e) =>
          setSelectedClient(
            clients.find((c) => c.id === e.target.value) || null
          )
        }
        className="w-full border p-2 rounded"
      >
        <option value="">Select client</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <div className="relative">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Type pump code"
          className="w-full border p-2 rounded"
        />

        {filteredPumps.length > 0 && (
          <div className="absolute z-10 bg-white border w-full max-h-48 overflow-y-auto rounded shadow">
            {filteredPumps.map((p) => (
              <button
                key={p.id}
                onClick={() => addPump(p)}
                className="block w-full text-left px-3 py-2 hover:bg-gray-100"
              >
                {p.code}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border rounded p-3">
        <p className="font-semibold mb-2">
          Selected pumps ({selectedPumps.length})
        </p>

        {selectedPumps.length === 0 && (
          <p className="text-sm text-gray-500">
            No pumps selected
          </p>
        )}

        <ul className="space-y-1">
          {selectedPumps.map((p) => (
            <li
              key={p.id}
              className="flex justify-between items-center text-sm"
            >
              {p.code}
              <button
                onClick={() => removePump(p.id)}
                className="text-red-600"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </div>

      <button
        disabled={
          loading ||
          !selectedClient ||
          selectedPumps.length === 0
        }
        onClick={createDelivery}
        className="w-full bg-purple-600 text-white py-3 rounded disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Delivery"}
      </button>
    </div>
  );
}
