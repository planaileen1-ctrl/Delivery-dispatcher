"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* =======================
   Types
======================= */
type Client = {
  id: string;
  name: string;
  address?: string;
  pharmacyId: string;
};

export default function PharmacyClientsPage() {
  const params = useParams();
  const pharmacyId = params.id as string;

  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  /* =======================
     LOAD CLIENTS
  ======================= */
  useEffect(() => {
    if (!pharmacyId) return;

    const q = query(
      collection(db, "clients"),
      where("pharmacyId", "==", pharmacyId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: Client[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Client, "id">),
      }));

      setClients(list);
      setLoading(false);
    });

    return () => unsub();
  }, [pharmacyId]);

  /* =======================
     DELETE CLIENT
  ======================= */
  const handleDelete = async (clientId: string) => {
    const ok = confirm(
      "Are you sure you want to delete this client?\nThis action cannot be undone."
    );

    if (!ok) return;

    try {
      await deleteDoc(doc(db, "clients", clientId));
    } catch (err) {
      console.error(err);
      alert("Client could not be deleted.");
    }
  };

  /* =======================
     UI
  ======================= */
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        Manage Clients
      </h1>

      <button
        onClick={() => router.push(`/pharmacy/${pharmacyId}`)}
        className="text-blue-600 hover:underline mb-4"
      >
        ← Back
      </button>

      {loading ? (
        <p>Loading clients...</p>
      ) : clients.length === 0 ? (
        <p>No clients created yet.</p>
      ) : (
        <div className="space-y-4">
          {clients.map((c) => (
            <div
              key={c.id}
              className="border rounded p-4 flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">{c.name}</p>
                {c.address && (
                  <p className="text-sm text-gray-600">
                    {c.address}
                  </p>
                )}
              </div>

              <div className="flex gap-4 text-sm">
                {/* EDIT */}
                <button
                  onClick={() =>
                    router.push(
                      `/pharmacy/${pharmacyId}/clients/${c.id}`
                    )
                  }
                  className="text-indigo-600 hover:underline"
                >
                  Edit
                </button>

                {/* HISTORY */}
                <button
                  onClick={() =>
                    router.push(
                      `/pharmacy/${pharmacyId}/clients/${c.id}/history`
                    )
                  }
                  className="text-purple-600 hover:underline"
                >
                  History
                </button>

                {/* DELETE */}
                <button
                  onClick={() => handleDelete(c.id)}
                  className="text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
