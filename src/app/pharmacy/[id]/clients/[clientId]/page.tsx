"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/* =======================
   Types
======================= */
type Client = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  pin: string;
  pharmacyId: string;
};

export default function EditClientPage() {
  const params = useParams();
  const pharmacyId = params.id as string;
  const clientId = params.clientId as string;

  const router = useRouter();

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* =======================
     LOAD CLIENT
  ======================= */
  useEffect(() => {
    if (!clientId) return;

    getDoc(doc(db, "clients", clientId))
      .then((snap) => {
        if (!snap.exists()) {
          setError("Client not found.");
          return;
        }

        setClient(snap.data() as Client);
      })
      .catch(() => setError("Failed to load client."))
      .finally(() => setLoading(false));
  }, [clientId]);

  /* =======================
     SAVE CLIENT
  ======================= */
  const handleSave = async () => {
    if (!client) return;

    if (!client.name || !client.pin) {
      setError("Name and PIN are required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await updateDoc(doc(db, "clients", clientId), {
        name: client.name,
        phone: client.phone || "",
        email: client.email || "",
        address: client.address || "",
        pin: client.pin,
      });

      router.push(`/pharmacy/${pharmacyId}/clients`);
    } catch (err) {
      console.error(err);
      setError("Client could not be updated.");
    } finally {
      setSaving(false);
    }
  };

  /* =======================
     UI
  ======================= */
  if (loading) {
    return <p className="p-6">Loading client...</p>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!client) return null;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <button
        onClick={() => router.push(`/pharmacy/${pharmacyId}/clients`)}
        className="text-blue-600 hover:underline mb-6"
      >
        ← Back to clients
      </button>

      <h1 className="text-2xl font-bold mb-6">Edit Client</h1>

      {/* NAME */}
      <label className="block mb-2 font-medium">Name</label>
      <input
        value={client.name}
        onChange={(e) => setClient({ ...client, name: e.target.value })}
        className="w-full border p-2 mb-4"
      />

      {/* PHONE */}
      <label className="block mb-2 font-medium">Phone</label>
      <input
        value={client.phone || ""}
        onChange={(e) => setClient({ ...client, phone: e.target.value })}
        className="w-full border p-2 mb-4"
        placeholder="+593..."
      />

      {/* EMAIL */}
      <label className="block mb-2 font-medium">Email (optional)</label>
      <input
        value={client.email || ""}
        onChange={(e) => setClient({ ...client, email: e.target.value })}
        className="w-full border p-2 mb-4"
      />

      {/* ADDRESS */}
      <label className="block mb-2 font-medium">Address</label>
      <input
        value={client.address || ""}
        onChange={(e) => setClient({ ...client, address: e.target.value })}
        className="w-full border p-2 mb-4"
      />

      {/* PIN */}
      <label className="block mb-2 font-medium">Access PIN</label>
      <input
        value={client.pin}
        onChange={(e) => setClient({ ...client, pin: e.target.value })}
        className="w-full border p-2 mb-6"
      />

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-purple-600 text-white px-6 py-3 rounded disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save changes"}
      </button>
    </div>
  );
}
