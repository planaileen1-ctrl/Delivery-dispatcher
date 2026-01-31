"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function CreatePumpPage() {
  const { pharmacyId } = useParams();
  const router = useRouter();

  const [code, setCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    setError("");

    if (!code || !expiresAt) {
      setError("Pump code and expiration date are required.");
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, "pumps"), {
        code: code.trim(),
        pharmacyId,

        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(
          new Date(expiresAt)
        ),

        status: "available",
        currentDeliveryId: null,
      });

      setCode("");
      setExpiresAt("");
    } catch (err) {
      console.error(err);
      setError("Error creating pump");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <button
        onClick={() => router.back()}
        className="text-blue-600 hover:underline mb-6"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold mb-6">
        Create Pump
      </h1>

      <div className="space-y-4 bg-white p-6 rounded-xl shadow">
        <input
          placeholder="Pump code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />

        <div>
          <label className="block text-sm mb-1">
            Expiration date
          </label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) =>
              setExpiresAt(e.target.value)
            }
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {error && (
          <p className="text-red-600 text-sm">
            {error}
          </p>
        )}

        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full bg-green-600 text-white py-3 rounded disabled:opacity-50"
        >
          {loading ? "Saving..." : "Create Pump"}
        </button>
      </div>
    </div>
  );
}
