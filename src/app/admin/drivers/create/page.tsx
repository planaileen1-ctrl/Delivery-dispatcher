"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
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

/* =======================
   Page
======================= */
export default function CreateDeliveryDriverPage() {
  const router = useRouter();

  const generatePin = () =>
    Math.floor(1000 + Math.random() * 9000).toString();

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    employeeCode: "",
    pin: generatePin(),
  });

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* =======================
     Load drivers list
  ======================= */
  useEffect(() => {
    const q = query(
      collection(db, "deliveryDrivers"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list: Driver[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Driver, "id">),
      }));

      setDrivers(list);
    });

    return () => unsub();
  }, []);

  /* =======================
     Handlers
  ======================= */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      await addDoc(collection(db, "deliveryDrivers"), {
        name: form.name || "Unnamed Driver",
        address: form.address || "",
        phone: form.phone || "",
        employeeCode: form.employeeCode || "",
        pin: form.pin,
        active: true,
        createdAt: serverTimestamp(),
      });

      // Reset form for next driver
      setForm({
        name: "",
        address: "",
        phone: "",
        employeeCode: "",
        pin: generatePin(),
      });
    } catch (err) {
      console.error("Firestore error:", err);
      setError("Error saving driver. Check Firestore rules.");
    } finally {
      setLoading(false);
    }
  };

  /* =======================
     UI
  ======================= */
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* FORM */}
        <div className="bg-white p-8 rounded-xl shadow">
          <button
            onClick={() => router.back()}
            className="text-sm text-blue-600 hover:underline mb-6"
          >
            ← Back
          </button>

          <h1 className="text-2xl font-bold mb-6">
            Create Delivery Driver
          </h1>

          {["name", "address", "phone", "employeeCode"].map((field) => (
            <div key={field} className="mb-4">
              <label className="block text-sm font-medium capitalize">
                {field === "employeeCode"
                  ? "Employee Code"
                  : field}
              </label>
              <input
                name={field}
                value={(form as any)[field]}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          ))}

          {/* PIN */}
          <div className="mb-6">
            <label className="block text-sm font-medium">
              Access PIN (auto-generated)
            </label>
            <input
              value={form.pin}
              disabled
              className="w-full border rounded px-3 py-2 text-center tracking-widest bg-gray-100 font-semibold"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm mb-4">
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Create Driver"}
          </button>
        </div>

        {/* LIST */}
        <div className="bg-white p-8 rounded-xl shadow">
          <h2 className="text-xl font-bold mb-4">
            Delivery Drivers ({drivers.length})
          </h2>

          {drivers.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No drivers created yet.
            </p>
          ) : (
            <div className="space-y-3">
              {drivers.map((driver) => (
                <div
                  key={driver.id}
                  className="border rounded-lg p-4 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium">
                      {driver.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {driver.phone || "No phone"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-semibold tracking-widest">
                      {driver.pin}
                    </p>
                    <span className="text-xs text-green-600">
                      Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
