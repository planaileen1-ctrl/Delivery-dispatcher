"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function CreatePharmacyPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    representative: "",
    whatsapp: "",
    address: "",
    pin: "",
  });

  const [loading, setLoading] = useState(false);
  const [successPin, setSuccessPin] = useState<string | null>(null);
  const [error, setError] = useState("");

  // 🔐 Generate 4-digit PIN automatically
  useEffect(() => {
    const generatePin = () =>
      Math.floor(1000 + Math.random() * 9000).toString();

    setForm((prev) => ({
      ...prev,
      pin: generatePin(),
    }));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    if (
      !form.name ||
      !form.email ||
      !form.representative ||
      !form.whatsapp ||
      !form.address
    ) {
      setError("All fields are required");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await addDoc(collection(db, "pharmacies"), {
        name: form.name,
        email: form.email,
        representative: form.representative,
        whatsapp: form.whatsapp,
        address: form.address,
        pin: form.pin,
        suspended: false,
        createdAt: serverTimestamp(),
      });

      setSuccessPin(form.pin);

      setForm({
        name: "",
        email: "",
        representative: "",
        whatsapp: "",
        address: "",
        pin: "",
      });
    } catch (err) {
      setError("Error creating pharmacy");
    } finally {
      setLoading(false);
    }
  };

  // 🌐 Send PIN via WhatsApp
  const sendWhatsapp = () => {
    if (!form.whatsapp || !successPin) return;
    const message = encodeURIComponent(
      `Your pharmacy access PIN is: ${successPin}`
    );
    window.open(`https://wa.me/${form.whatsapp}?text=${message}`, "_blank");
  };

  // 📧 Send PIN via Email
  const sendEmail = () => {
    if (!form.email || !successPin) return;
    const subject = encodeURIComponent("Your Pharmacy Access PIN");
    const body = encodeURIComponent(
      `Your pharmacy access PIN is: ${successPin}`
    );
    window.open(`mailto:${form.email}?subject=${subject}&body=${body}`, "_blank");
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      {/* 🔙 Back */}
      <button
        onClick={() => router.push("/admin/dashboard")}
        className="mb-6 text-sm text-blue-600 hover:underline"
      >
        ← Back to Dashboard
      </button>

      <h1 className="text-3xl font-bold mb-8 text-gray-800">
        Create Pharmacy
      </h1>

      <div className="bg-white rounded-xl shadow p-6 space-y-5">
        <input
          name="name"
          placeholder="Pharmacy Name"
          value={form.name}
          onChange={handleChange}
          className="w-full border rounded-lg p-3"
        />

        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          className="w-full border rounded-lg p-3"
        />

        <input
          name="representative"
          placeholder="Representative Name"
          value={form.representative}
          onChange={handleChange}
          className="w-full border rounded-lg p-3"
        />

        <input
          name="whatsapp"
          placeholder="WhatsApp Number (with country code)"
          value={form.whatsapp}
          onChange={handleChange}
          className="w-full border rounded-lg p-3"
        />

        {/* ADDRESS */}
        <input
          name="address"
          placeholder="Address"
          value={form.address}
          onChange={handleChange}
          className="w-full border rounded-lg p-3"
        />

        {/* 🔐 AUTO PIN */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Access PIN (auto-generated)
          </label>
          <input
            value={form.pin}
            disabled
            className="w-full border rounded-lg p-3 text-center tracking-widest bg-gray-100 font-semibold"
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
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
        >
          {loading ? "Creating..." : "Create Pharmacy"}
        </button>

        {/* ✅ SUCCESS */}
        {successPin && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
            <p className="text-green-700 font-medium">
              Pharmacy created successfully
            </p>

            <p className="text-sm text-gray-700">
              Generated PIN:
            </p>

            <p className="text-2xl font-bold tracking-widest text-green-700">
              {successPin}
            </p>

            <div className="flex gap-4 mt-3">
              <button
                onClick={sendWhatsapp}
                className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition"
              >
                Send via WhatsApp
              </button>

              <button
                onClick={sendEmail}
                className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
              >
                Send via Email
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
