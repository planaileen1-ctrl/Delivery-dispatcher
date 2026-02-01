"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* =======================
   TYPES
======================= */
type Client = {
  id: string;
  name: string;
  country?: string;
  state?: string;
  city?: string;
};

type Pump = {
  id: string;
  code: string;
};

type Employee = {
  id: string;
  name: string;
};

/* =======================
   HELPERS
======================= */
const generateOrderCode = () => {
  const d = new Date();
  return `DEL-${d
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
};

const formatUS = (d: Date) =>
  d.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

const EMAIL_FUNCTION_URL =
  "https://us-central1-delivery-dispatcher-f11cc.cloudfunctions.net/sendEmail";

/* =======================
   PAGE
======================= */
export default function CreateDeliveryPage() {
  const router = useRouter();
  const params = useParams();

  const pharmacyId =
    (params.pharmacyId as string) ||
    (params.id as string);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [now, setNow] = useState(new Date());

  const [clients, setClients] = useState<Client[]>([]);
  const [pumps, setPumps] = useState<Pump[]>([]);

  const [selectedClient, setSelectedClient] =
    useState<Client | null>(null);
  const [selectedPumps, setSelectedPumps] = useState<string[]>([]);
  const [searchPump, setSearchPump] = useState("");

  const [orderCode] = useState(generateOrderCode());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* =======================
     CLOCK
  ======================= */
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* =======================
     SESSION
  ======================= */
  useEffect(() => {
    const emp = localStorage.getItem("employee");
    if (!emp) {
      router.push("/pharmacy/login");
      return;
    }
    setEmployee(JSON.parse(emp));
  }, [router]);

  /* =======================
     LOAD CLIENTS
  ======================= */
  useEffect(() => {
    if (!pharmacyId) return;

    getDocs(
      query(
        collection(db, "clients"),
        where("pharmacyId", "==", pharmacyId)
      )
    ).then((snap) =>
      setClients(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Client, "id">),
        }))
      )
    );
  }, [pharmacyId]);

  /* =======================
     LOAD PUMPS
  ======================= */
  useEffect(() => {
    if (!pharmacyId) return;

    getDocs(
      query(
        collection(db, "pumps"),
        where("pharmacyId", "==", pharmacyId),
        where("status", "==", "available")
      )
    ).then((snap) =>
      setPumps(
        snap.docs.map((d) => ({
          id: d.id,
          code: d.data().code,
        }))
      )
    );
  }, [pharmacyId]);

  /* =======================
     PUMPS
  ======================= */
  const addPump = (code: string) => {
    if (!code) return;
    if (!selectedPumps.includes(code)) {
      setSelectedPumps([...selectedPumps, code]);
    }
    setSearchPump("");
  };

  const filteredPumps = pumps.filter((p) =>
    p.code.toLowerCase().includes(searchPump.toLowerCase())
  );

  /* =======================
     CREATE DELIVERY
  ======================= */
  const handleCreate = async () => {
    setError("");
    setSuccess("");

    if (!employee) {
      setError("Session expired");
      return;
    }

    if (!selectedClient) {
      setError("Client is required");
      return;
    }

    if (
      !selectedClient.country ||
      !selectedClient.state ||
      !selectedClient.city
    ) {
      setError("Client location is incomplete");
      return;
    }

    if (selectedPumps.length === 0) {
      setError("At least one pump is required");
      return;
    }

    try {
      setLoading(true);

      const country = selectedClient.country.trim().toLowerCase();
      const state = selectedClient.state.trim().toLowerCase();
      const city = selectedClient.city.trim().toLowerCase();

      const deliveryRef = await addDoc(
        collection(db, "deliveries"),
        {
          orderCode,
          pharmacyId,

          clientId: selectedClient.id,
          clientName: selectedClient.name,

          country,
          state,
          city,

          pumps: selectedPumps,
          driverId: null,

          createdBy: {
            employeeId: employee.id,
            employeeName: employee.name,
          },

          status: "created",
          createdAt: serverTimestamp(),
        }
      );

      /* 🔔 NOTIFY DRIVERS */
      const driversSnap = await getDocs(
        query(
          collection(db, "deliveryDrivers"),
          where("active", "==", true),
          where("country", "==", country),
          where("state", "==", state),
          where("city", "==", city)
        )
      );

      for (const d of driversSnap.docs) {
        const driver = d.data();

        await addDoc(collection(db, "notifications"), {
          userId: d.id,
          role: "driver",
          title: "New delivery available",
          message: `Order ${orderCode} available in your area`,
          deliveryId: deliveryRef.id,
          read: false,
          createdAt: serverTimestamp(),
        });

        if (driver.email) {
          fetch(EMAIL_FUNCTION_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: driver.email,
              subject: "New delivery available",
              text: `Order ${orderCode} - ${city}`,
            }),
          }).catch(() => {});
        }
      }

      setSuccess(`Delivery ${orderCode} created`);
      setSelectedClient(null);
      setSelectedPumps([]);
    } catch (e) {
      console.error("CREATE DELIVERY ERROR:", e);
      setError("Error creating delivery");
    } finally {
      setLoading(false);
    }
  };

  /* =======================
     UI
  ======================= */
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <button
        onClick={() => router.push(`/pharmacy/${pharmacyId}`)}
        className="text-blue-600 hover:underline"
      >
        ← Back to menu
      </button>

      <h1 className="text-2xl font-bold">Create Delivery</h1>

      <p className="text-sm text-gray-600">
        Employee: <strong>{employee?.name}</strong>
        <br />
        Date & Time: {formatUS(now)}
      </p>

      <p className="font-semibold">Order Code: {orderCode}</p>

      <select
        className="w-full border p-2"
        value={selectedClient?.id || ""}
        onChange={(e) =>
          setSelectedClient(
            clients.find((c) => c.id === e.target.value) || null
          )
        }
      >
        <option value="">Select client</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <input
        value={searchPump}
        onChange={(e) => setSearchPump(e.target.value)}
        placeholder="Scan or type pump code"
        className="w-full border p-2"
        onKeyDown={(e) => {
          if (e.key === "Enter") addPump(searchPump.trim());
        }}
      />

      {searchPump && (
        <div className="border rounded max-h-40 overflow-y-auto">
          {filteredPumps.map((p) => (
            <div
              key={p.id}
              onClick={() => addPump(p.code)}
              className="px-3 py-2 cursor-pointer hover:bg-gray-100"
            >
              {p.code}
            </div>
          ))}
        </div>
      )}

      <div className="border rounded p-3">
        <strong>Selected Pumps</strong>
        {selectedPumps.length === 0 ? (
          <p className="text-sm text-gray-500">No pumps added</p>
        ) : (
          <ul className="list-disc pl-5">
            {selectedPumps.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-red-600">{error}</p>}
      {success && <p className="text-green-600">{success}</p>}

      <button
        onClick={handleCreate}
        disabled={loading}
        className="w-full bg-purple-600 text-white py-3 rounded"
      >
        {loading ? "Saving..." : "Create Delivery"}
      </button>
    </div>
  );
}
