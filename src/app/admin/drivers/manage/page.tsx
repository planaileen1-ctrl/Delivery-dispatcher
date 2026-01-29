"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type Driver = {
  id: string;
  name: string;
  address: string;
  phone: string;
  employeeCode: string;
  pin: string;
  active: boolean;
};

export default function ManageDriversPage() {
  const router = useRouter();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Driver>>({});

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

  return (
    <div className="max-w-5xl mx-auto p-6">
      
      {/* 🔙 BACK TO ADMIN DASHBOARD */}
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
                          setForm({
                            ...form,
                            [field]: e.target.value,
                          })
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
                    className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
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

                  <button
                    onClick={() => startEdit(driver)}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
