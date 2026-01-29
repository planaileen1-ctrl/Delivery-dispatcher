"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function CreatePharmacyPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [representative, setRepresentative] = useState("");
  const [loading, setLoading] = useState(false);
  const [successPin, setSuccessPin] = useState<string | null>(null);
  const [error, setError] = useState("");

  // 🔐 Generate 4-digit PIN
  const generatePin = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const handleSubmit = async () => {
    if (!name || !email || !representative) {
      setError("All fields are required");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const pin = generatePin();

      await addDoc(collection(db, "pharmacies"), {
        name,
        email,
        representative,
        pin,
        createdAt: serverTimestamp(),
      });

      setSuccessPin(pin);

      setName("");
      setEmail("");
      setRepresentative("");
    } catch (err) {
      setError("Error creating pharmacy");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      {/* 🔙 Back link */}
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
          type="text"
          placeholder="Pharmacy Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded-lg p-3"
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-lg p-3"
        />

        <input
          type="text"
          placeholder="Representative Name"
          value={representative}
          onChange={(e) => setRepresentative(e.target.value)}
          className="w-full border rounded-lg p-3"
        />

        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
        >
          {loading ? "Creating..." : "Create Pharmacy"}
        </button>

        {successPin && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 font-medium">
              Pharmacy created successfully
            </p>
            <p className="mt-2 text-sm text-gray-700">
              Generated PIN:
            </p>
            <p className="text-2xl font-bold tracking-widest text-green-700">
              {successPin}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
