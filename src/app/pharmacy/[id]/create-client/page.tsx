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
   CONFIG
======================= */
const EMAIL_FUNCTION_URL =
  "https://us-central1-delivery-dispatcher-f11cc.cloudfunctions.net/sendEmail";

/* =======================
   Types
======================= */
type Client = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  pin: string;
};

/* =======================
   Page
======================= */
export default function CreateClientPage() {
  const router = useRouter();
  const params = useParams();

  const pharmacyId =
    (params.pharmacyId as string) ||
    (params.id as string);

  const generatePin = () =>
    Math.floor(1000 + Math.random() * 9000).toString();

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    pin: generatePin(),
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* =======================
     Load clients
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

  const sendClientEmail = async (client: {
    name: string;
    email: string;
    pin: string;
  }) => {
    const html = `
      <div style="font-family: Arial, sans-serif; line-height:1.6">
        <h2>Welcome to Delivery Dispatcher</h2>

        <p>Hello <strong>${client.name}</strong>,</p>

        <p>Your client account has been created successfully.</p>

        <p><strong>Access PIN:</strong></p>
        <h1 style="letter-spacing:4px">${client.pin}</h1>

        <p>You can now use this PIN when placing orders.</p>

        <p style="margin-top:30px;font-size:12px;color:#666">
          If you did not expect this email, please contact your pharmacy.
        </p>
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

    if (!pharmacyId) {
      setError("Pharmacy not detected. Check the URL.");
      return;
    }

    try {
      setLoading(true);

      const clientData = {
        name: form.name || "",
        address: form.address || "",
        phone: form.phone || "",
        email: form.email || "",
        pin: form.pin,
        pharmacyId,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "clients"), clientData);

      // 📧 Send email (same pattern as others)
      if (form.email) {
        try {
          await sendClientEmail({
            name: clientData.name || "Client",
            email: clientData.email,
            pin: clientData.pin,
          });
        } catch (mailError) {
          console.error("Email error:", mailError);
        }
      }

      // Reset form
      setForm({
        name: "",
        address: "",
        phone: "",
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
            className="text-sm text-blue-600 hover:underline mb-6"
          >
            ← Back
          </button>

          <h1 className="text-2xl font-bold mb-6">
            Create Client
          </h1>

          <div className="space-y-4">
            {["name", "address", "phone", "email"].map((field) => (
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
                      {client.email || client.phone}
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
