"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* =======================
   CONFIG
======================= */
const EMAIL_FUNCTION_URL =
  "https://us-central1-delivery-dispatcher-f11cc.cloudfunctions.net/sendEmail";

/* =======================
   TYPES
======================= */
type Client = {
  id: string;
  name: string;
  email: string;
  address: string;
  pin: string;
};

/* =======================
   HELPERS
======================= */
const generatePin = () =>
  Math.floor(1000 + Math.random() * 9000).toString();

/**
 * 🇺🇸 MM/DD/YYYY hh:mm:ss AM/PM
 */
const formatUSDateTime = (date: Date) =>
  date.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

/* =======================
   PAGE
======================= */
export default function CreateClientPage() {
  const router = useRouter();
  const params = useParams();

  const pharmacyId =
    (params.pharmacyId as string) ||
    (params.id as string);

  /* =======================
     SESSION
  ======================= */
  const [employee, setEmployee] = useState<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const emp = localStorage.getItem("employee");
    if (emp) {
      setEmployee(JSON.parse(emp));
    }
  }, []);

  /* =======================
     LIVE CLOCK ⏱
  ======================= */
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  /* =======================
     FORM
  ======================= */
  const [form, setForm] = useState({
    name: "",
    address: "",
    email: "",
    pin: generatePin(),
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* =======================
     LOAD CLIENTS
  ======================= */
  useEffect(() => {
    if (!pharmacyId) return;

    const q = query(
      collection(db, "clients"),
      where("pharmacyId", "==", pharmacyId)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list: Client[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Client, "id">),
      }));

      setClients(list);
    });

    return () => unsub();
  }, [pharmacyId]);

  /* =======================
     HANDLERS
  ======================= */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const sendClientEmail = async (client: {
    name: string;
    email: string;
    pin: string;
  }) => {
    if (!client.email) return;

    const html = `
      <div style="font-family:Arial;line-height:1.6">
        <h2>Client Account Created</h2>
        <p>Hello <strong>${client.name}</strong>,</p>
        <p>Your client account has been created.</p>
        <p><strong>Access PIN:</strong></p>
        <h1 style="letter-spacing:4px">${client.pin}</h1>
      </div>
    `;

    await fetch(EMAIL_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: client.email,
        subject: "Your Client Access PIN",
        html,
      }),
    });
  };

  const handleSubmit = async () => {
    setError("");

    if (!pharmacyId || !employee) {
      setError("Session not detected.");
      return;
    }

    try {
      setLoading(true);

      // ⏱ EXACT TIMESTAMP (VISIBLE = SAVED)
      const createdAtUS = formatUSDateTime(now);

      const clientData = {
        name: form.name,
        address: form.address,
        email: form.email,
        pin: form.pin,

        pharmacyId,

        // 🧾 AUDIT
        createdByEmployeeId: employee.id,
        createdByEmployeeName: employee.name,
        createdAtUS, // ← exact MM/DD/YYYY hh:mm:ss AM/PM

        createdAt: serverTimestamp(), // technical
      };

      await addDoc(collection(db, "clients"), clientData);

      await sendClientEmail({
        name: clientData.name || "Client",
        email: clientData.email,
        pin: clientData.pin,
      });

      setForm({
        name: "",
        address: "",
        email: "",
        pin: generatePin(),
      });
    } catch (err) {
      console.error(err);
      setError("Error creating client");
    } finally {
      setLoading(false);
    }
  };

  /* =======================
     UI
  ======================= */
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* FORM */}
        <div className="bg-white p-8 rounded-xl shadow">
          <button
            onClick={() => router.back()}
            className="text-sm text-blue-600 hover:underline mb-4"
          >
            ← Back
          </button>

          <h1 className="text-2xl font-bold mb-2">
            Create Client
          </h1>

          {/* 👤 EMPLOYEE + ⏱ CLOCK */}
          {employee && (
            <div className="text-sm text-gray-600 mb-6 space-y-1">
              <p>
                <strong>Employee:</strong> {employee.name}
              </p>
              <p>
                <strong>Date & Time:</strong>{" "}
                <span className="font-mono">
                  {formatUSDateTime(now)}
                </span>
              </p>
            </div>
          )}

          <div className="space-y-4">
            {["name", "address", "email"].map((field) => (
              <input
                key={field}
                name={field}
                placeholder={field.toUpperCase()}
                value={(form as any)[field]}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            ))}

            <div>
              <label className="block text-sm font-medium mb-1">
                Client PIN
              </label>
              <input
                value={form.pin}
                disabled
                className="w-full border rounded px-3 py-2 text-center bg-gray-100 font-semibold"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm">
                {error}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg"
            >
              {loading ? "Saving..." : "Create Client & Send Email"}
            </button>
          </div>
        </div>

        {/* LIST */}
        <div className="bg-white p-8 rounded-xl shadow">
          <h2 className="text-xl font-bold mb-4">
            Clients ({clients.length})
          </h2>

          {clients.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No clients created yet.
            </p>
          ) : (
            <div className="space-y-3">
              {clients.map((c) => (
                <div
                  key={c.id}
                  className="border rounded-lg p-4 flex justify-between"
                >
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-gray-500">
                      {c.email}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold tracking-widest">
                      {c.pin}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
