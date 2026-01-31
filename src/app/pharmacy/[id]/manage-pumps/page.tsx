"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* =======================
   TYPES
======================= */
type Pump = {
  id: string;
  code: string;
  status: "available" | "assigned" | "expired";
  createdAt?: Timestamp;
  expiresAt?: Timestamp;
};

/* =======================
   PAGE
======================= */
export default function ManagePumpsPage() {
  const params = useParams();
  const router = useRouter();

  const pharmacyId =
    typeof params.pharmacyId === "string"
      ? params.pharmacyId
      : "";

  const [pumps, setPumps] = useState<Pump[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newExpiresAt, setNewExpiresAt] = useState("");

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [editData, setEditData] = useState({
    code: "",
    expiresAt: "",
    status: "available" as Pump["status"],
  });

  /* =======================
     LOAD PUMPS
  ======================= */
  useEffect(() => {
    if (!pharmacyId) return;

    const q = query(
      collection(db, "pumps"),
      where("pharmacyId", "==", pharmacyId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: Pump[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Pump, "id">),
      }));
      setPumps(list);
    });

    return () => unsub();
  }, [pharmacyId]);

  /* =======================
     DATE HELPERS
  ======================= */
  const formatDate = (t?: Timestamp) => {
    if (!t) return "—";
    return t.toDate().toLocaleDateString("en-US");
  };

  const parseUSDate = (value: string) => {
    const match = value.match(
      /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/
    );
    if (!match) return null;

    const [m, d, y] = value.split("/");
    const date = new Date(+y, +m - 1, +d);
    return isNaN(date.getTime()) ? null : date;
  };

  /* =======================
     CREATE
  ======================= */
  const createPump = async () => {
    if (!newCode || !newExpiresAt) {
      alert("Pump code and expiration date required");
      return;
    }

    const parsed = parseUSDate(newExpiresAt);
    if (!parsed) {
      alert("Date must be MM/DD/YYYY");
      return;
    }

    await addDoc(collection(db, "pumps"), {
      code: newCode.trim(),
      pharmacyId,
      status: "available",
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(parsed),
    });

    setNewCode("");
    setNewExpiresAt("");
  };

  /* =======================
     EDIT
  ======================= */
  const startEdit = (p: Pump) => {
    setEditingId(p.id);
    setEditData({
      code: p.code,
      status: p.status,
      expiresAt: p.expiresAt
        ? p.expiresAt.toDate().toLocaleDateString("en-US")
        : "",
    });
  };

  const saveEdit = async (id: string) => {
    const parsed = parseUSDate(editData.expiresAt);
    if (!parsed) {
      alert("Invalid date format");
      return;
    }

    await updateDoc(doc(db, "pumps", id), {
      code: editData.code.trim(),
      status: editData.status,
      expiresAt: Timestamp.fromDate(parsed),
    });

    setEditingId(null);
  };

  /* =======================
     DELETE
  ======================= */
  const removePump = async (id: string) => {
    if (!confirm("Delete this pump?")) return;
    await deleteDoc(doc(db, "pumps", id));
  };

  /* =======================
     UI
  ======================= */
  return (
    <div className="max-w-5xl mx-auto p-6">
      <button
        onClick={() => router.back()}
        className="text-blue-600 hover:underline mb-6"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold mb-6">
        Manage Pumps
      </h1>

      {/* CREATE */}
      <div className="bg-white p-4 rounded shadow mb-8 space-y-3">
        <h2 className="font-semibold">
          Add new pump
        </h2>

        <input
          placeholder="Pump code"
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          className="w-full border p-2 rounded"
        />

        <input
          placeholder="MM/DD/YYYY"
          value={newExpiresAt}
          onChange={(e) =>
            setNewExpiresAt(e.target.value)
          }
          className="w-full border p-2 rounded"
        />

        <button
          onClick={createPump}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Add Pump
        </button>
      </div>

      {/* LIST */}
      {pumps.length === 0 && (
        <p className="text-gray-500">
          No pumps created yet.
        </p>
      )}

      <div className="space-y-4">
        {pumps.map((p) => (
          <div
            key={p.id}
            className="border rounded p-4 bg-white"
          >
            {editingId === p.id ? (
              <div className="space-y-2">
                <input
                  value={editData.code}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      code: e.target.value,
                    })
                  }
                  className="w-full border p-2 rounded"
                />

                <input
                  value={editData.expiresAt}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      expiresAt: e.target.value,
                    })
                  }
                  className="w-full border p-2 rounded"
                />

                <select
                  value={editData.status}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      status: e.target.value as Pump["status"],
                    })
                  }
                  className="w-full border p-2 rounded"
                >
                  <option value="available">
                    Available
                  </option>
                  <option value="assigned">
                    Assigned
                  </option>
                  <option value="expired">
                    Expired
                  </option>
                </select>

                <div className="flex gap-3">
                  <button
                    onClick={() => saveEdit(p.id)}
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                  >
                    Save
                  </button>
                  <button
                    onClick={() =>
                      setEditingId(null)
                    }
                    className="bg-gray-300 px-4 py-2 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p><strong>Code:</strong> {p.code}</p>
                <p><strong>Status:</strong> {p.status}</p>
                <p><strong>Created:</strong> {formatDate(p.createdAt)}</p>
                <p><strong>Expires:</strong> {formatDate(p.expiresAt)}</p>

                <div className="flex gap-3 mt-3">
                  <button
                    onClick={() => startEdit(p)}
                    className="bg-blue-600 text-white px-3 py-1 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removePump(p.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
