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

export default function PharmacyClientsPage() {
  const { id } = useParams(); // pharmacyId
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;

    const q = query(
      collection(db, "clients"),
      where("pharmacyId", "==", id)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setClients(list);
    });

    return () => unsub();
  }, [id]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        Manage Clients
      </h1>

      <button
        onClick={() => router.back()}
        className="text-blue-600 hover:underline mb-4"
      >
        ← Back
      </button>

      {clients.length === 0 ? (
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
                <p className="text-sm text-gray-600">
                  {c.address}
                </p>
              </div>

              <div className="flex gap-3 text-sm">
                <button
                  onClick={() =>
                    router.push(
                      `/pharmacy/${id}/clients/${c.id}`
                    )
                  }
                  className="text-indigo-600 hover:underline"
                >
                  Edit
                </button>

                <button
                  onClick={() =>
                    router.push(
                      `/pharmacy/clients/${c.id}/history`
                    )
                  }
                  className="text-purple-600 hover:underline"
                >
                  History
                </button>

                <button
                  onClick={() =>
                    deleteDoc(doc(db, "clients", c.id))
                  }
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
