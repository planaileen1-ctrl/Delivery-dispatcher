"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* =======================
   TYPES
======================= */
type Pump = {
  id: string;
  code: string;
  pharmacyId: string;
  createdAt?: Timestamp;
  createdAtUS: string;
  createdByEmployeeName: string;
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
      : typeof params.id === "string"
      ? params.id
      : "";

  const employee =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("employee") || "null")
      : null;

  const [pumps, setPumps] = useState<Pump[]>([]);
  const [filtered, setFiltered] = useState<Pump[]>([]);

  /* 🔍 Filters */
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  /* ⏱ Live clock */
  const [now, setNow] = useState("");

  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleString("en-US", {
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);

  /* =======================
     LOAD PUMPS (REALTIME)
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
      setFiltered(list);
    });

    return () => unsub();
  }, [pharmacyId]);

  /* =======================
     FILTER LOGIC
  ======================= */
  useEffect(() => {
    let result = [...pumps];

    if (search.trim()) {
      result = result.filter((p) =>
        p.code.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (startDate) {
      const s = new Date(startDate).getTime();
      result = result.filter((p) =>
        p.createdAt?.toDate().getTime()! >= s
      );
    }

    if (endDate) {
      const e = new Date(endDate).getTime();
      result = result.filter((p) =>
        p.createdAt?.toDate().getTime()! <= e
      );
    }

    setFiltered(result);
  }, [search, startDate, endDate, pumps]);

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
        Manage Pumps
      </h1>

      <p className="text-sm text-gray-600 mb-6">
        Employee: <strong>{employee?.name}</strong>
        <br />
        Date & Time: {now}
      </p>

      {/* FILTERS */}
      <div className="bg-white p-4 rounded-xl shadow mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 🔍 Search */}
        <input
          placeholder="🔍 Search pump code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-3 py-2"
        />

        {/* 📅 Start */}
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border rounded px-3 py-2"
        />

        {/* 📅 End */}
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border rounded px-3 py-2"
        />
      </div>

      {/* LIST */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="font-semibold text-lg mb-4">
          Results ({filtered.length})
        </h2>

        {filtered.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No pumps found.
          </p>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="border rounded-lg p-4"
              >
                <p className="font-medium">
                  Code: {p.code}
                </p>
                <p className="text-xs text-gray-600">
                  Created by:{" "}
                  <strong>{p.createdByEmployeeName}</strong>
                </p>
                <p className="text-xs text-gray-500">
                  {p.createdAtUS}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
