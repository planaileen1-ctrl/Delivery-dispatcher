"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
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
type Pharmacy = {
  id: string;
  name: string;
  email: string;
  representative: string;
  whatsapp: string;
  address: string;
  pin: string;
  suspended: boolean;
};

/* =======================
   Page
======================= */
export default function CreatePharmacyPage() {
  const router = useRouter();

  const generatePin = () =>
    Math.floor(1000 + Math.random() * 9000).toString();

  const [form, setForm] = useState({
    name: "",
    email: "",
    representative: "",
    whatsapp: "",
    address: "",
    pin: generatePin(),
  });

  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* =======================
     Load pharmacies (REALTIME)
  ======================= */
  useEffect(() => {
    const q = query(
      collection(db, "pharmacies"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list: Pharmacy[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Pharmacy, "id">),
      }));
      setPharmacies(list);
    });

    return () => unsub();
  }, []);

  /* =======================
     Handlers
  ======================= */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const sendWelcomeEmail = async (pharmacy: {
    name: string;
    email: string;
    pin: string;
  }) => {
    const html = `
      <div style="font-family: Arial, sans-serif; line-height:1.6">
        <h2>Welcome to Delivery Dispatcher</h2>

        <p>Hello <strong>${pharmacy.name}</strong>,</p>

        <p>Your pharmacy account has been created successfully.</p>

        <p><strong>Access PIN:</strong></p>
        <h1 style="letter-spacing:4px">${pharmacy.pin}</h1>

        <p>You can now access the pharmacy system using this PIN.</p>

        <p style="margin-top:30px;font-size:12px;color:#666">
          If you did not expect this email, please contact your administrator.
        </p>
      </div>
    `;

    await fetch(EMAIL_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: pharmacy.email,
        subject: "Your Pharmacy Access PIN",
        html,
      }),
    });
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      const pharmacyData = {
        name: form.name,
        email: form.email,
        representative: form.representative,
        whatsapp: form.whatsapp,
        address: form.address,
        pin: form.pin,
        suspended: false,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "pharmacies"), pharmacyData);

      // 📧 Send email (same logic as drivers)
      if (form.email) {
        try {
          await sendWelcomeEmail({
            name: pharmacyData.name,
            email: pharmacyData.email,
            pin: pharmacyData.pin,
          });
        } catch (mailError) {
          console.error("Email error:", mailError);
        }
      }

      // Reset form
      setForm({
        name: "",
        email: "",
        representative: "",
        whatsapp: "",
        address: "",
        pin: generatePin(),
      });
    } catch (err) {
      console.error("Firestore error:", err);
      setError("Error creating pharmacy.");
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
            Create Pharmacy
          </h1>

          {[
            ["name", "Pharmacy Name"],
            ["email", "Email"],
            ["representative", "Representative Name"],
            ["whatsapp", "WhatsApp (+country)"],
            ["address", "Address"],
          ].map(([field, label]) => (
            <div key={field} className="mb-4">
              <label className="block text-sm font-medium">
                {label}
              </label>
              <input
                name={field}
                value={(form as any)[field]}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          ))}

          <div className="mb-6">
            <label className="block text-sm font-medium">
              Access PIN (auto-generated)
            </label>
            <input
              value={form.pin}
              disabled
              className="w-full border rounded px-3 py-2 text-center tracking-widest bg-gray-100 font-semibold"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm mb-4">
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Create Pharmacy & Send Email"}
          </button>
        </div>

        {/* LIST */}
        <div className="bg-white p-8 rounded-xl shadow">
          <h2 className="text-xl font-bold mb-4">
            Pharmacies ({pharmacies.length})
          </h2>

          {pharmacies.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No pharmacies created yet.
            </p>
          ) : (
            <div className="space-y-3">
              {pharmacies.map((p) => (
                <div
                  key={p.id}
                  className="border rounded-lg p-4 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-gray-500">
                      {p.email}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-semibold tracking-widest">
                      {p.pin}
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
