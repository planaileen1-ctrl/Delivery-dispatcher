"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* =======================
   TYPES
======================= */
type CountryCode = "US" | "EC";

type Client = {
  id: string;
  name: string;
  email: string;
  address: string;
  pin: string;
  country: CountryCode;
  state: string;
  city: string;
};

/* =======================
   CONFIG
======================= */
const EMAIL_FUNCTION_URL =
  "https://us-central1-delivery-dispatcher-f11cc.cloudfunctions.net/sendEmail";

/* =======================
   COUNTRIES & REGIONS
======================= */
const COUNTRIES: Record<
  CountryCode,
  { label: string; regions: string[] }
> = {
  US: {
    label: "United States",
    regions: [
      "Alabama","Alaska","Arizona","Arkansas","California","Colorado",
      "Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho",
      "Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana",
      "Maine","Maryland","Massachusetts","Michigan","Minnesota",
      "Mississippi","Missouri","Montana","Nebraska","Nevada",
      "New Hampshire","New Jersey","New Mexico","New York",
      "North Carolina","North Dakota","Ohio","Oklahoma","Oregon",
      "Pennsylvania","Rhode Island","South Carolina","South Dakota",
      "Tennessee","Texas","Utah","Vermont","Virginia","Washington",
      "West Virginia","Wisconsin","Wyoming",
    ],
  },
  EC: {
    label: "Ecuador",
    regions: [
      "Azuay","Bolívar","Cañar","Carchi","Chimborazo","Cotopaxi",
      "El Oro","Esmeraldas","Galápagos","Guayas","Imbabura","Loja",
      "Los Ríos","Manabí","Morona Santiago","Napo","Orellana",
      "Pastaza","Pichincha","Santa Elena",
      "Santo Domingo de los Tsáchilas","Sucumbíos",
      "Tungurahua","Zamora Chinchipe",
    ],
  },
};

/* =======================
   HELPERS
======================= */
const generatePin = () =>
  Math.floor(1000 + Math.random() * 9000).toString();

const formatUSDateTime = (date: Date) =>
  date.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

/* =======================
   PAGE
======================= */
export default function CreateClientPage() {
  const router = useRouter();
  const params = useParams();

  const pharmacyId =
    (params.pharmacyId as string) ||
    (params.id as string);

  /* =======================
     SESSION
  ======================= */
  const [employee, setEmployee] = useState<any>(null);

  useEffect(() => {
    const emp = localStorage.getItem("employee");
    if (emp) setEmployee(JSON.parse(emp));
  }, []);

  /* =======================
     CLOCK
  ======================= */
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* =======================
     FORM
  ======================= */
  const [form, setForm] = useState({
    name: "",
    address: "",
    email: "",
    country: "US" as CountryCode,
    state: "",
    city: "",
    pin: generatePin(),
  });

  const regions = COUNTRIES[form.country].regions;

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* =======================
     LOAD CLIENTS
  ======================= */
  useEffect(() => {
    if (!pharmacyId) return;

    const q = query(
      collection(db, "clients"),
      where("pharmacyId", "==", pharmacyId)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setClients(
        snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Client, "id">),
        }))
      );
    });

    return () => unsub();
  }, [pharmacyId]);

  /* =======================
     HANDLERS
  ======================= */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setError("");

    if (!pharmacyId || !employee) {
      setError("Session not detected.");
      return;
    }

    if (!form.name || !form.email || !form.state || !form.city) {
      setError("All fields are required.");
      return;
    }

    try {
      setLoading(true);

      const createdAtUS = formatUSDateTime(now);

      await addDoc(collection(db, "clients"), {
        ...form,
        pharmacyId,

        createdByEmployeeId: employee.id,
        createdByEmployeeName: employee.name,
        createdAtUS,
        createdAt: serverTimestamp(),
      });

      setForm({
        name: "",
        address: "",
        email: "",
        country: form.country,
        state: "",
        city: "",
        pin: generatePin(),
      });
    } catch (err) {
      console.error(err);
      setError("Error creating client");
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
            className="text-sm text-blue-600 hover:underline mb-4"
          >
            ← Back
          </button>

          <h1 className="text-2xl font-bold mb-2">Create Client</h1>

          {employee && (
            <div className="text-sm text-gray-600 mb-6">
              <p><strong>Employee:</strong> {employee.name}</p>
              <p><strong>Date & Time:</strong> {formatUSDateTime(now)}</p>
            </div>
          )}

          <div className="space-y-4">
            <input name="name" placeholder="NAME" value={form.name} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
            <input name="address" placeholder="ADDRESS" value={form.address} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
            <input name="email" placeholder="EMAIL" value={form.email} onChange={handleChange} className="w-full border px-3 py-2 rounded" />

            {/* COUNTRY */}
            <select name="country" value={form.country} onChange={(e) =>
              setForm({ ...form, country: e.target.value as CountryCode, state: "" })
            } className="w-full border px-3 py-2 rounded">
              {Object.entries(COUNTRIES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>

            {/* STATE */}
            <select name="state" value={form.state} onChange={handleChange} className="w-full border px-3 py-2 rounded">
              <option value="">Select state / province</option>
              {regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            <input name="city" placeholder="CITY" value={form.city} onChange={handleChange} className="w-full border px-3 py-2 rounded" />

            <input value={form.pin} disabled className="w-full border px-3 py-2 rounded bg-gray-100 text-center font-semibold" />

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button onClick={handleSubmit} disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded">
              {loading ? "Saving..." : "Create Client"}
            </button>
          </div>
        </div>

        {/* LIST */}
        <div className="bg-white p-8 rounded-xl shadow">
          <h2 className="text-xl font-bold mb-4">
            Clients ({clients.length})
          </h2>

          {clients.length === 0 ? (
            <p className="text-gray-500 text-sm">No clients created yet.</p>
          ) : (
            <div className="space-y-3">
              {clients.map((c) => (
                <div key={c.id} className="border p-4 rounded">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-gray-500">
                    {c.city}, {c.state}, {c.country}
                  </p>
                  <p className="font-mono tracking-widest">{c.pin}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
