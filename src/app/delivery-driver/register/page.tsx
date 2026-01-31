"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* =======================
   EMAIL CONFIG
======================= */
const EMAIL_FUNCTION_URL =
  "https://us-central1-delivery-dispatcher-f11cc.cloudfunctions.net/sendEmail";

/* =======================
   STATES (50 estados)
======================= */
const STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina",
  "North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
];

/* =======================
   PAGE
======================= */
export default function DriverRegisterPage() {
  const router = useRouter();

  // 🔐 PIN automático (una sola vez)
  const generatePin = () =>
    Math.floor(1000 + Math.random() * 9000).toString();

  const pinRef = useRef(generatePin());

  const [form, setForm] = useState({
    name: "",
    email: "",
    state: "",
    county: "",
    city: "",
    pin: pinRef.current,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* =======================
     SEND EMAIL
  ======================= */
  const sendEmail = async () => {
    const html = `
      <div style="font-family:Arial;line-height:1.6">
        <h2>Driver Registered Successfully</h2>

        <p><strong>Name:</strong> ${form.name}</p>
        <p><strong>Location:</strong> ${form.city}, ${form.county}, ${form.state}</p>

        <hr />

        <p><strong>Your access PIN:</strong></p>
        <h1 style="letter-spacing:5px">${form.pin}</h1>

        <p>Please keep this PIN secure. You will need it to access the driver app.</p>

        <p style="font-size:12px;color:#666;margin-top:30px">
          If you did not request this registration, please contact support.
        </p>
      </div>
    `;

    const res = await fetch(EMAIL_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: form.email,
        subject: "Your Driver Access PIN",
        html,
      }),
    });

    if (!res.ok) {
      throw new Error("Email failed");
    }
  };

  /* =======================
     SUBMIT
  ======================= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (
      !form.name ||
      !form.email ||
      !form.state ||
      !form.county ||
      !form.city
    ) {
      setError("All fields are required");
      return;
    }

    try {
      setLoading(true);

      // 🔒 Validar PIN único
      const q = query(
        collection(db, "deliveryDrivers"),
        where("pin", "==", form.pin)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        setError("PIN collision, refresh and try again");
        setLoading(false);
        return;
      }

      await addDoc(collection(db, "deliveryDrivers"), {
        name: form.name,
        email: form.email,
        state: form.state,
        county: form.county,
        city: form.city,
        pin: form.pin,
        active: true,
        createdAt: serverTimestamp(),
      });

      // 📧 SEND EMAIL
      await sendEmail();

      // 🔁 BACK TO LOGIN
      router.push("/delivery-driver/login");
    } catch (err) {
      console.error(err);
      setError("Error registering driver");
    } finally {
      setLoading(false);
    }
  };

  /* =======================
     UI
  ======================= */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow-md w-full max-w-lg"
      >
        <h1 className="text-2xl font-bold mb-6 text-center">
          Register Driver
        </h1>

        <div className="space-y-4">
          <input
            name="name"
            placeholder="Full name"
            value={form.name}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />

          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />

          <select
            name="state"
            value={form.state}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          >
            <option value="">Select state</option>
            {STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <input
            name="county"
            placeholder="County"
            value={form.county}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />

          <input
            name="city"
            placeholder="City"
            value={form.city}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />

          {/* PIN */}
          <div>
            <label className="text-sm font-medium">
              Access PIN (auto-generated)
            </label>
            <input
              value={form.pin}
              disabled
              className="w-full border p-2 rounded bg-gray-100 text-center tracking-widest font-semibold"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 text-white py-3 rounded hover:bg-orange-700 disabled:opacity-60"
          >
            {loading ? "Saving..." : "Register Driver"}
          </button>
        </div>
      </form>
    </div>
  );
}
