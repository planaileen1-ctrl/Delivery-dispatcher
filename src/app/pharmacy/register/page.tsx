"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  addDoc,
  serverTimestamp,
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
   HELPERS
======================= */
const generatePin = () =>
  Math.floor(1000 + Math.random() * 9000).toString();

const formatUSDate = () => {
  return new Date().toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

/* =======================
   PAGE
======================= */
export default function PharmacyRegisterPage() {
  const router = useRouter();

  const pinRef = useRef(generatePin());
  const dateRef = useRef(formatUSDate());

  const [form, setForm] = useState({
    name: "",
    email: "",
    representativeName: "",
    address: "",
    state: "",
    county: "",
    city: "",
    pin: pinRef.current,
    createdAtUS: dateRef.current,
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
        <h2>Pharmacy Registration Confirmation</h2>

        <p><strong>Pharmacy:</strong> ${form.name}</p>
        <p><strong>Representative:</strong> ${form.representativeName}</p>
        <p><strong>Address:</strong> ${form.address}</p>
        <p><strong>Location:</strong> ${form.city}, ${form.county}, ${form.state}</p>
        <p><strong>Registered on:</strong> ${form.createdAtUS}</p>

        <hr />

        <p><strong>Your access PIN:</strong></p>
        <h1 style="letter-spacing:5px">${form.pin}</h1>

        <p>Please keep this PIN secure. You will need it to access the system.</p>

        <p style="font-size:12px;color:#666;margin-top:30px">
          If you did not request this registration, please contact support.
        </p>
      </div>
    `;

    await fetch(EMAIL_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: form.email,
        subject: "Pharmacy Registration Details",
        html,
      }),
    });
  };

  /* =======================
     SUBMIT
  ======================= */
  const handleSubmit = async () => {
    setError("");

    if (
      !form.name ||
      !form.email ||
      !form.representativeName ||
      !form.address ||
      !form.state ||
      !form.county ||
      !form.city
    ) {
      setError("All fields are required");
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, "pharmacies"), {
        ...form,
        suspended: false,
        createdAt: serverTimestamp(), // backend real
      });

      await sendEmail();

      router.push("/pharmacy/login");
    } catch (err) {
      console.error(err);
      setError("Error registering pharmacy");
    } finally {
      setLoading(false);
    }
  };

  /* =======================
     UI
  ======================= */
  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* FORM */}
      <div className="w-1/2 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-lg space-y-4">
          <h1 className="text-2xl font-bold text-center">
            Register Pharmacy
          </h1>

          <input name="name" placeholder="Pharmacy name" value={form.name} onChange={handleChange} className="w-full border p-2 rounded" />
          <input name="email" placeholder="Email" value={form.email} onChange={handleChange} className="w-full border p-2 rounded" />
          <input name="representativeName" placeholder="Representative name" value={form.representativeName} onChange={handleChange} className="w-full border p-2 rounded" />
          <input name="address" placeholder="Address" value={form.address} onChange={handleChange} className="w-full border p-2 rounded" />

          <select name="state" value={form.state} onChange={handleChange} className="w-full border p-2 rounded">
            <option value="">Select state</option>
            {STATES.map((s) => <option key={s}>{s}</option>)}
          </select>

          <input name="county" placeholder="County" value={form.county} onChange={handleChange} className="w-full border p-2 rounded" />
          <input name="city" placeholder="City" value={form.city} onChange={handleChange} className="w-full border p-2 rounded" />

          <button onClick={handleSubmit} disabled={loading} className="w-full bg-green-600 text-white py-3 rounded">
            {loading ? "Saving..." : "Register Pharmacy"}
          </button>

          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
      </div>

      {/* LIVE PREVIEW */}
      <div className="w-1/2 bg-white border-l p-8">
        <h2 className="text-xl font-bold mb-4">Live Preview</h2>
        <p><strong>Pharmacy:</strong> {form.name}</p>
        <p><strong>Representative:</strong> {form.representativeName}</p>
        <p><strong>Address:</strong> {form.address}</p>
        <p><strong>Location:</strong> {form.city}, {form.county}, {form.state}</p>
        <p><strong>Registered on:</strong> {form.createdAtUS}</p>

        <div className="mt-4 p-4 border rounded bg-gray-100 text-center">
          <p className="text-sm">Access PIN</p>
          <p className="text-2xl font-bold tracking-widest">{form.pin}</p>
        </div>
      </div>
    </div>
  );
}
