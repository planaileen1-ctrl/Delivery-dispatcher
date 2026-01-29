"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function CreateClientPage() {
  const router = useRouter();
  const params = useParams();
  const pharmacyId = params.id as string;

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    pin: "",
  });

  const [loading, setLoading] = useState(false);

  // 🔢 Generate PIN automatically
  useEffect(() => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setForm((prev) => ({ ...prev, pin }));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      await addDoc(collection(db, "clients"), {
        name: form.name || "",
        address: form.address || "",
        phone: form.phone || "",
        pin: form.pin,
        pharmacyId, // 🔐 CRITICAL LINE
        createdAt: serverTimestamp(),
      });

      alert("Client created successfully");
      router.back();
    } catch (err) {
      console.error(err);
      alert("Error creating client");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <button
        onClick={() => router.back()}
        className="mb-6 text-sm text-blue-600 hover:underline"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold mb-6">
        Create Client
      </h1>

      <div className="space-y-4 bg-white p-6 rounded-xl shadow">
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
          placeholder="Phone Number"
          value={form.phone}
          onChange={handleChange}
          className="w-full border rounded px-3 py-2"
        />

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

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
        >
          {loading ? "Saving..." : "Create Client"}
        </button>
      </div>
    </div>
  );
}
