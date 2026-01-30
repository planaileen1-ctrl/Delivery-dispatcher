"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type PumpMovement = {
  id: string;
  pumpCode: string;
  type: "DELIVERY" | "RETURN";
  clientName: string;
  driverName: string;
  createdAt?: Date;
  receivedAt?: Date;
  returnedAt?: Date;
  status: string;
};

export default function PumpTraceabilityPage() {
  const { id: pharmacyId } = useParams();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [movements, setMovements] = useState<PumpMovement[]>([]);
  const [loading, setLoading] = useState(true);

  /* 🔹 LOAD ALL MOVEMENTS */
  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const q = query(
        collection(db, "deliveries"),
        where("pharmacyId", "==", pharmacyId)
      );

      const snap = await getDocs(q);
      const result: PumpMovement[] = [];

      for (const d of snap.docs) {
        const data = d.data();

        // CLIENT
        let clientName = "—";
        if (data.clientId) {
          const cs = await getDoc(doc(db, "clients", data.clientId));
          if (cs.exists()) clientName = cs.data().name;
        }

        // DRIVER
        let driverName = "—";
        if (data.driverId) {
          const ds = await getDoc(
            doc(db, "deliveryDrivers", data.driverId)
          );
          if (ds.exists()) driverName = ds.data().name;
        }

        const type: "DELIVERY" | "RETURN" =
          data.type === "return" ? "RETURN" : "DELIVERY";

        for (const pump of data.pumpCodes || []) {
          result.push({
            id: `${d.id}_${pump}`,
            pumpCode: String(pump),
            type,
            clientName,
            driverName,
            createdAt: data.createdAt?.toDate(),
            receivedAt: data.receivedAt?.toDate(),
            returnedAt: data.returnedAt?.toDate(),
            status: data.status,
          });
        }
      }

      // 🧠 ORDER BY DATE DESC
      result.sort(
        (a, b) =>
          (b.createdAt?.getTime() || 0) -
          (a.createdAt?.getTime() || 0)
      );

      setMovements(result);
      setLoading(false);
    };

    load();
  }, [pharmacyId]);

  /* 🔍 FILTER */
  const filtered = movements.filter((m) => {
    const pump = m.pumpCode.toLowerCase();
    const searchValue = search.trim().toLowerCase();

    if (searchValue && !pump.includes(searchValue)) return false;

    if (fromDate && m.createdAt) {
      if (m.createdAt < new Date(fromDate)) return false;
    }

    if (toDate && m.createdAt) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      if (m.createdAt > end) return false;
    }

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto p-6">

      {/* NAV */}
      <button
        onClick={() => router.push(`/pharmacy/${pharmacyId}`)}
        className="text-blue-600 hover:underline mb-6"
      >
        ← Back to menu
      </button>

      <h1 className="text-3xl font-bold mb-6">
        Pump Traceability
      </h1>

      {/* FILTERS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <input
          placeholder="Search pump code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded"
        />

        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="border p-2 rounded"
        />

        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="border p-2 rounded"
        />

        <button
          onClick={() => {
            setSearch("");
            setFromDate("");
            setToDate("");
          }}
          className="bg-gray-200 rounded"
        >
          Clear
        </button>
      </div>

      {/* TABLE */}
      {loading ? (
        <p className="text-gray-500">Loading pump history…</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">No pump movements found.</p>
      ) : (
        <div className="overflow-auto bg-white rounded-xl shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Pump</th>
                <th className="p-3">Type</th>
                <th className="p-3">Client</th>
                <th className="p-3">Driver</th>
                <th className="p-3">Created</th>
                <th className="p-3">Received</th>
                <th className="p-3">Returned</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="p-3 font-semibold">{m.pumpCode}</td>
                  <td className="p-3">
                    {m.type === "RETURN" ? "RETURN" : "DELIVERY"}
                  </td>
                  <td className="p-3">{m.clientName}</td>
                  <td className="p-3">{m.driverName}</td>
                  <td className="p-3">
                    {m.createdAt?.toLocaleString() || "—"}
                  </td>
                  <td className="p-3">
                    {m.receivedAt?.toLocaleString() || "—"}
                  </td>
                  <td className="p-3">
                    {m.returnedAt?.toLocaleString() || "—"}
                  </td>
                  <td className="p-3">{m.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
