"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function CreateDeliveryDriverPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    employeeCode: "",
    pin: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🔢 GENERATE 4-DIGIT PIN AUTOMATICALLY
  useEffect(() => {
    const generatePin = () => {
      return Math.floor(1000 + Math.random() * 9000).toString();
    };

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
    setError("");

    if (
      !form.name ||
      !form.address ||
      !form.phone ||
      !form.employeeCode
    ) {
      setError("All fields are required.");
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, "deliveryDrivers"), {
        name: form.name,
        address: form.address,
        phone: form.phone,
        employeeCode: form.employeeCode,
        pin: form.pin, // 🔐 auto-generated
        active: true,
        createdAt: serverTimestamp(),
      });

      alert("Delivery driver created successfully");
      router.push("/admin/dashboard");
    } catch (err) {
      console.error(err);
      setError("Error creating delivery driver");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-xl mx-auto bg-white p-8 rounded-xl shadow">
        
        {/* BACK */}
        <button
          onClick={() => router.back()}
          className="text-sm text-blue-600 hover:underline mb-6"
        >
          ← Back
        </button>

        <h1 className="text-2xl font-bold mb-6">
          Create Delivery Driver
        </h1>

        {/* NAME */}
        <div className="mb-4">
          <label className="block text-sm font-medium">
            Full Name
          </label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* ADDRESS */}
        <div className="mb-4">
          <label className="block text-sm font-medium">
            Address
          </label>
          <input
            name="address"
            value={form.address}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* PHONE */}
        <div className="mb-4">
          <label className="block text-sm font-medium">
            Phone Number
          </label>
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* EMPLOYEE CODE */}
        <div className="mb-4">
          <label className="block text-sm font-medium">
            Employee Code
          </label>
          <input
            name="employeeCode"
            value={form.employeeCode}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* 🔐 AUTO PIN */}
        <div className="mb-6">
          <label className="block text-sm font-medium">
            Access PIN (auto-generated)
          </label>
          <input
            value={form.pin}
            disabled
            className="w-full border rounded px-3 py-2 text-center tracking-widest bg-gray-100 font-semibold"
          />
          <p className="text-xs text-gray-500 mt-1">
            This PIN will be used by the driver to log in.
          </p>
        </div>

        {error && (
          <p className="text-red-600 text-sm mb-4">
            {error}
          </p>
        )}

        {/* SAVE */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Create Driver"}
        </button>
      </div>
    </div>
  );
}
