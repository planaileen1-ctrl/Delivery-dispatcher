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
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* =======================
   Types
======================= */
type Client = {
  id: string;
  name: string;
  phone: string;
  address: string;
  pin: string;
};

/* =======================
   Page
======================= */
export default function CreateClientPage() {
  const router = useRouter();
  const params = useParams();

  // ✅ ROBUST pharmacyId (works with any route)
  const pharmacyId =
    (params.pharmacyId as string) ||
    (params.id as string);

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    pin: "",
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* =======================
     Generate PIN
  ======================= */
  const generatePin = () =>
    Math.floor(1000 + Math.random() * 9000).toString();

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      pin: generatePin(),
    }));
  }, []);

  /* =======================
     Load clients (by pharmacy)
  ======================= */
  useEffect(() => {
    if (!pharmacyId) return;

    const q = query(
      collection(db, "clients"),
      where("pharmacyId", "==", pharmacyId),
      orderBy("createdAt", "desc")
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
     Handlers
  ======================= */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    setError("");

    if (!pharmacyId) {
      setError("Pharmacy not detected. Check the URL.");
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, "clients"), {
        name: form.name || "",
        address: form.address || "",
        phone: form.phone || "",
        pin: form.pin,
        pharmacyId, // 🔗 CRITICAL & FIXED
        createdAt: serverTimestamp(),
      });

      // 🔁 Reset form, generate new PIN
      setForm({
        name: "",
        address: "",
        phone: "",
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

        {/* =======================
            FORM
        ======================= */}
        <div className="bg-white p-8 rounded-xl shadow">
          <button
            onClick={() => router.back()}
            className="text-sm text-blue-600 hover:underline mb-6"
          >
            ← Back
          </button>

          <h1 className="text-2xl font-bold mb-6">
            Create Client
          </h1>

          <div className="space-y-4">
            <input
              name="name"
              placeholder="Client Name"
              value={form.name}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
            />

            <input
              name="address"
              placeholder="Address"
              value={form.address}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
            />

            <input
              name="phone"
              placeholder="Phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
            />

            {/* PIN */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Client PIN (auto-generated)
              </label>
              <input
                value={form.pin}
                disabled
                className="w-full border rounded px-3 py-2 text-center tracking-widest bg-gray-100 font-semibold"
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
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Create Client"}
            </button>
          </div>
        </div>

        {/* =======================
            CLIENTS LIST
        ======================= */}
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
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="border rounded-lg p-4 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium">
                      {client.name || "Unnamed client"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {client.phone || "No phone"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-semibold tracking-widest">
                      {client.pin}
                    </p>
                    <span className="text-xs text-green-600">
                      Active
                    </span>
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
