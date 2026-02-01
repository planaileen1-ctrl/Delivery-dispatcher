"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* =======================
   TYPES
======================= */
type CountryCode = "US" | "EC";

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

const formatUSDate = () =>
  new Date().toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

/* =======================
   PAGE
======================= */
export default function PharmacyRegisterPage() {
  const router = useRouter();

  const pinRef = useRef(generatePin());
  const dateRef = useRef(formatUSDate());

  const [form, setForm] = useState<{
    name: string;
    email: string;
    representativeName: string;
    country: CountryCode;
    state: string;
    city: string;
    pin: string;
    createdAtUS: string;
  }>({
    name: "",
    email: "",
    representativeName: "",
    country: "US",
    state: "",
    city: "",
    pin: pinRef.current,
    createdAtUS: dateRef.current,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const regions = COUNTRIES[form.country].regions;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* =======================
     SUBMIT
  ======================= */
  const handleSubmit = async () => {
    setError("");

    if (
      !form.name ||
      !form.email ||
      !form.representativeName ||
      !form.state ||
      !form.city
    ) {
      setError("All fields are required");
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, "pharmacies"), {
        ...form,
        country: form.country,
        state: form.state.toLowerCase(),
        city: form.city.toLowerCase(),
        suspended: false,
        createdAt: serverTimestamp(),
      });

      router.push("/pharmacy/login");
    } catch (err) {
      console.error(err);
      setError("Error registering pharmacy");
    } finally {
      setLoading(false);
    }
  };

  /* =======================
     UI
  ======================= */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-lg space-y-4">
        <h1 className="text-2xl font-bold text-center">
          Register Pharmacy
        </h1>

        <input
          name="name"
          placeholder="Pharmacy name"
          value={form.name}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <input
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <input
          name="representativeName"
          placeholder="Representative name"
          value={form.representativeName}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        {/* COUNTRY */}
        <select
          name="country"
          value={form.country}
          onChange={(e) =>
            setForm({
              ...form,
              country: e.target.value as CountryCode,
              state: "",
            })
          }
          className="w-full border p-2 rounded"
        >
          {Object.entries(COUNTRIES).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>

        {/* STATE */}
        <select
          name="state"
          value={form.state}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        >
          <option value="">Select state / province</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        {/* CITY */}
        <input
          name="city"
          placeholder="City"
          value={form.city}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        {/* PIN */}
        <input
          value={`Access PIN: ${form.pin}`}
          disabled
          className="w-full border p-2 rounded bg-gray-100 text-center tracking-widest"
        />

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-green-600 text-white py-3 rounded"
        >
          {loading ? "Saving..." : "Register Pharmacy"}
        </button>

        {error && <p className="text-red-600 text-sm">{error}</p>}
      </div>
    </div>
  );
}
