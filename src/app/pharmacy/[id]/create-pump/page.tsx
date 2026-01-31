"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
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
  createdAt?: Timestamp | null;
  createdAtClient?: Timestamp;
};

/* =======================
   PAGE
======================= */
export default function CreatePumpPage() {
  const params = useParams();
  const router = useRouter();

  const pharmacyId =
    typeof params.pharmacyId === "string"
      ? params.pharmacyId
      : "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pumps, setPumps] = useState<Pump[]>([]);

  /* =======================
     LOAD PUMPS (REALTIME)
  ======================= */
  useEffect(() => {
    if (!pharmacyId) return;

    const q = query(
      collection(db, "pumps"),
      where("pharmacyId", "==", pharmacyId),
      orderBy("createdAtClient", "desc")
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
     CREATE PUMP
  ======================= */
  const handleCreate = async () => {
    setError("");

    if (!code.trim()) {
      setError("Pump code is required.");
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, "pumps"), {
        code: code.trim(),
        pharmacyId,
        status: "available",
        currentDeliveryId: null,
        createdAt: serverTimestamp(),          // Firebase real timestamp
        createdAtClient: Timestamp.now(),      // Immediate UI timestamp
      });

      setCode("");
    } catch (err) {
      console.error(err);
      setError("Error creating pump");
    } finally {
      setLoading(false);
    }
  };

  /* =======================
     FORMAT DATE
  ======================= */
  const formatDate = (t?: Timestamp | null) => {
    if (!t) return "—";
    return t.toDate().toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  /* =======================
     UI
  ======================= */
  return (
    <div className="max-w-6xl mx-auto p-6">
      <button
        onClick={() => router.back()}
        className="text-blue-600 hover:underline mb-6"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold mb-6">
        Create Pumps
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* LEFT — CREATE */}
        <div className="bg-white p-6 rounded-xl shadow space-y-4">
          <h2 className="font-semibold text-lg">
            Add new pump
          </h2>

          <input
            placeholder="Pump code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />

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

        {/* RIGHT — LIST (REALTIME) */}
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="font-semibold text-lg mb-4">
            Pumps created ({pumps.length})
          </h2>

          {pumps.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No pumps created yet.
            </p>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto">
              {pumps.map((p) => (
                <div
                  key={p.id}
                  className="border rounded-lg p-4 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium">
                      Code: {p.code}
                    </p>
                    <p className="text-xs text-gray-500">
                      Created:{" "}
                      {formatDate(p.createdAt ?? p.createdAtClient)}
                    </p>
                  </div>

                  <span className="text-xs text-green-600 font-semibold">
                    AVAILABLE
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
