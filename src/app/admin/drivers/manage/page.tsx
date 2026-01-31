"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* =======================
   Types
======================= */
type Driver = {
  id: string;
  name: string;
  address: string;
  phone: string;
  employeeCode: string;
  pin: string;
  active: boolean;
};

type Trip = {
  id: string;
  from?: string;
  to?: string;
  createdAt: Timestamp;
};

/* =======================
   Page
======================= */
export default function ManageDriversPage() {
  const router = useRouter();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Driver>>({});

  const [historyDriver, setHistoryDriver] = useState<Driver | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  /* =======================
     Load drivers
  ======================= */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "deliveryDrivers"), (snapshot) => {
      const list: Driver[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Driver, "id">),
      }));
      setDrivers(list);
    });

    return () => unsub();
  }, []);

  /* =======================
     Edit
  ======================= */
  const startEdit = (driver: Driver) => {
    setEditingId(driver.id);
    setForm(driver);
  };

  const saveEdit = async () => {
    if (!editingId) return;

    await updateDoc(doc(db, "deliveryDrivers", editingId), {
      name: form.name || "",
      address: form.address || "",
      phone: form.phone || "",
      employeeCode: form.employeeCode || "",
      pin: form.pin || "",
      active: form.active ?? true,
    });

    setEditingId(null);
    setForm({});
  };

  /* =======================
     Delete
  ======================= */
  const deleteDriver = async (id: string) => {
    if (!confirm("Are you sure you want to delete this driver?")) return;
    await deleteDoc(doc(db, "deliveryDrivers", id));
  };

  /* =======================
     Load trips (RANGE)
  ======================= */
  const loadTrips = (driver: Driver) => {
    setHistoryDriver(driver);

    let q = query(
      collection(db, "deliveryTrips"),
      where("driverId", "==", driver.id)
    );

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      q = query(
        collection(db, "deliveryTrips"),
        where("driverId", "==", driver.id),
        where("createdAt", ">=", Timestamp.fromDate(start)),
        where("createdAt", "<=", Timestamp.fromDate(end))
      );
    }

    return onSnapshot(q, (snap) => {
      const list: Trip[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Trip, "id">),
      }));
      setTrips(list);
    });
  };

  /* =======================
     UI
  ======================= */
  return (
    <div className="max-w-5xl mx-auto p-6">
      <button
        onClick={() => router.push("/admin/dashboard")}
        className="mb-6 text-sm text-blue-600 hover:underline"
      >
        ← Back to Dashboard
      </button>

      <h1 className="text-3xl font-bold mb-8">
        Manage Delivery Drivers
      </h1>

      <div className="space-y-4">
        {drivers.map((driver) => {
          const isEditing = editingId === driver.id;

          return (
            <div
              key={driver.id}
              className="border rounded-xl p-4 bg-white shadow-sm"
            >
              {isEditing ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {["name", "address", "phone", "employeeCode", "pin"].map(
                    (field) => (
                      <input
                        key={field}
                        value={(form as any)[field] || ""}
                        onChange={(e) =>
                          setForm({ ...form, [field]: e.target.value })
                        }
                        placeholder={field}
                        className="border rounded px-3 py-2"
                      />
                    )
                  )}

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.active ?? true}
                      onChange={(e) =>
                        setForm({ ...form, active: e.target.checked })
                      }
                    />
                    Active
                  </label>

                  <button
                    onClick={saveEdit}
                    className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{driver.name}</p>
                    <p className="text-xs text-gray-500">
                      {driver.phone || "No phone"} · PIN {driver.pin}
                    </p>
                    <p className="text-xs">
                      {driver.active ? "🟢 Active" : "🔴 Suspended"}
                    </p>
                  </div>

                  <div className="flex gap-3 text-sm">
                    <button
                      onClick={() => loadTrips(driver)}
                      title="View trip history"
                    >
                      🔍
                    </button>

                    <button
                      onClick={() => startEdit(driver)}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => deleteDriver(driver.id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* =======================
         Trip History Modal
      ======================= */}
      {historyDriver && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 w-full max-w-xl">
            <h2 className="text-xl font-bold mb-4">
              Trip History – {historyDriver.name}
            </h2>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border rounded px-3 py-2"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border rounded px-3 py-2"
              />
            </div>

            <button
              onClick={() => loadTrips(historyDriver)}
              className="mb-4 bg-blue-600 text-white px-4 py-2 rounded"
            >
              Search
            </button>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {trips.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No trips found.
                </p>
              ) : (
                trips.map((t) => (
                  <div
                    key={t.id}
                    className="border rounded p-2 text-sm"
                  >
                    <p>
                      {t.from || "Unknown"} → {t.to || "Unknown"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t.createdAt.toDate().toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => {
                setHistoryDriver(null);
                setTrips([]);
                setStartDate("");
                setEndDate("");
              }}
              className="mt-4 text-sm text-blue-600 hover:underline"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
