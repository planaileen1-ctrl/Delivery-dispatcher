"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function CreatePharmacyPage() {
  const router = useRouter();

  const emptyForm = {
    name: "",
    email: "",
    representative: "",
    whatsapp: "",
    address: "",
    pin: "",
  };

  const [form, setForm] = useState(emptyForm);
  const [createdPharmacy, setCreatedPharmacy] =
    useState<null | {
      name: string;
      email: string;
      whatsapp: string;
      pin: string;
    }>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🔐 Generate PIN
  const generatePin = () =>
    Math.floor(1000 + Math.random() * 9000).toString();

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      pin: generatePin(),
    }));
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
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

      // ✅ guardar farmacia creada
      setCreatedPharmacy({
        name: form.name,
        email: form.email,
        whatsapp: form.whatsapp,
        pin: form.pin,
      });

      // 🔁 reset form + nuevo PIN
      setForm({
        ...emptyForm,
        pin: generatePin(),
      });
    } catch {
      setError("Error creating pharmacy");
    } finally {
      setLoading(false);
    }
  };

  // 📲 WhatsApp
  const sendWhatsapp = () => {
    if (!createdPharmacy) return;
    const message = encodeURIComponent(
      `Hello ${createdPharmacy.name}, your pharmacy access PIN is: ${createdPharmacy.pin}`
    );
    window.open(
      `https://wa.me/${createdPharmacy.whatsapp}?text=${message}`,
      "_blank"
    );
  };

  // 📧 Email
  const sendEmail = () => {
    if (!createdPharmacy) return;
    const subject = encodeURIComponent(
      "Your Pharmacy Access PIN"
    );
    const body = encodeURIComponent(
      `Hello ${createdPharmacy.name}, your pharmacy access PIN is: ${createdPharmacy.pin}`
    );
    window.open(
      `mailto:${createdPharmacy.email}?subject=${subject}&body=${body}`,
      "_blank"
    );
  };

  return (
    <div className="max-w-3xl mx-auto p-6">

      {/* 🔙 BACK */}
      <button
        onClick={() => router.push("/admin/dashboard")}
        className="mb-6 text-sm text-blue-600 hover:underline"
      >
        ← Back to Dashboard
      </button>

      <h1 className="text-3xl font-bold mb-8 text-gray-800">
        Create Pharmacy
      </h1>

      <div className="grid md:grid-cols-2 gap-8">

        {/* 📋 FORM */}
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
            placeholder="WhatsApp (+country)"
            value={form.whatsapp}
            onChange={handleChange}
            className="w-full border rounded-lg p-3"
          />

          <input
            name="address"
            placeholder="Address"
            value={form.address}
            onChange={handleChange}
            className="w-full border rounded-lg p-3"
          />

          <div>
            <label className="block text-sm font-medium mb-1">
              Access PIN
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
        </div>

        {/* ✅ CREATED */}
        {createdPharmacy && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-green-800">
              Pharmacy Registered
            </h2>

            <p>
              <strong>Name:</strong>{" "}
              {createdPharmacy.name}
            </p>

            <p>
              <strong>PIN:</strong>{" "}
              <span className="font-bold tracking-widest">
                {createdPharmacy.pin}
              </span>
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={sendWhatsapp}
                className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600"
              >
                Send WhatsApp
              </button>

              <button
                onClick={sendEmail}
                className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
              >
                Send Email
              </button>
            </div>

            <p className="text-sm text-gray-600 pt-2">
              You can now register another pharmacy.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
