"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* =======================
   TYPES
======================= */
type Pump = {
  id: string;
  code: string;
  status: string;
  createdAtUS: string;
  createdByEmployeeName: string;
  registerCode: string;
};

/* =======================
   HELPERS
======================= */
const formatUSNow = () =>
  new Date().toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

const generateRegisterCode = () =>
  "REG-" + Math.random().toString(36).substring(2, 8).toUpperCase();

/* =======================
   PAGE
======================= */
export default function Page() {
  const params = useParams();
  const router = useRouter();

  const pharmacyId =
    typeof params.id === "string" ? params.id : "";

  const [employee, setEmployee] = useState<any>(null);
  const [ready, setReady] = useState(false);

  const [code, setCode] = useState("");
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(formatUSNow());

  /* =======================
     LIVE CLOCK
  ======================= */
  useEffect(() => {
    const t = setInterval(() => {
      setNow(formatUSNow());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  /* =======================
     SESSION
  ======================= */
  useEffect(() => {
    const emp = localStorage.getItem("employee");
    if (!emp) {
      router.push("/pharmacy/login");
      return;
    }
    setEmployee(JSON.parse(emp));
    setReady(true);
  }, [router]);

  /* =======================
     REALTIME PUMPS
  ======================= */
  useEffect(() => {
    if (!pharmacyId) return;

    const q = query(
      collection(db, "pumps"),
      where("pharmacyId", "==", pharmacyId)
    );

    return onSnapshot(q, (snap) => {
      setPumps(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Pump, "id">),
        }))
      );
    });
  }, [pharmacyId]);

  if (!ready) return null;

  /* =======================
     CREATE PUMP
  ======================= */
  const handleCreate = async () => {
    if (!code.trim()) {
      setError("Pump code required");
      return;
    }

    if (pumps.some((p) => p.code === code.trim())) {
      setError("This pump already exists");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await addDoc(collection(db, "pumps"), {
        code: code.trim(),
        pharmacyId,
        status: "available",

        // 🔑 OBLIGATORIO POR RULES
        createdByEmployeeId: employee.id,
        createdByEmployeeName: employee.name,

        registerCode: generateRegisterCode(),
        createdAtUS: formatUSNow(),
        createdAt: serverTimestamp(),
      });

      setCode("");
    } catch (e) {
      console.error(e);
      setError("Error creating pump");
    } finally {
      setLoading(false);
    }
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

      <h1 className="text-2xl font-bold mb-2">
        Create Pumps
      </h1>

      <p className="text-sm text-gray-600">
        <strong>Employee:</strong> {employee.name}
      </p>
      <p className="text-sm text-gray-600 mb-6">
        <strong>Date & Time:</strong> {now}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CREATE */}
        <div className="bg-white p-6 rounded-xl shadow space-y-4">
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
            className="w-full bg-green-600 text-white py-3 rounded"
          >
            {loading ? "Saving..." : "Create Pump"}
          </button>
        </div>

        {/* LIST */}
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="font-semibold mb-4">
            Pumps created ({pumps.length})
          </h2>

          <div className="space-y-3 max-h-[420px] overflow-y-auto">
            {pumps.map((p) => (
              <div
                key={p.id}
                className="border rounded p-3"
              >
                <p>
                  <strong>Code:</strong> {p.code}
                </p>
                <p className="text-sm">
                  <strong>Status:</strong>{" "}
                  <span className="capitalize">
                    {p.status}
                  </span>
                </p>
                <p className="text-xs text-gray-500">
                  {p.createdByEmployeeName} —{" "}
                  {p.createdAtUS}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
