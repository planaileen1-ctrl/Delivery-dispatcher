"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* =======================
   TYPES
======================= */
type CountryCode = "US" | "EC";

/* =======================
   EMAIL CONFIG
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

export default function DriverRegisterPage() {
  const router = useRouter();

  // 🔐 PIN fijo por render
  const pinRef = useRef(generatePin());

  /* =======================
     FORM
  ======================= */
  const [form, setForm] = useState<{
    name: string;
    email: string;
    country: CountryCode;
    state: string;
    county: string;
    city: string;
    pin: string;
  }>({
    name: "",
    email: "",
    country: "US",
    state: "",
    county: "",
    city: "",
    pin: pinRef.current,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const regions = COUNTRIES[form.country].regions;

  /* =======================
     SIGNATURE (MOUSE + TOUCH)
  ======================= */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const getPoint = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const rect = canvasRef.current!.getBoundingClientRect();

    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDraw = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    const { x, y } = getPoint(e);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawing.current = true;
  };

  const drawLine = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!drawing.current) return;
    e.preventDefault();

    const { x, y } = getPoint(e);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => {
    drawing.current = false;
  };

  const clearSignature = () => {
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.clearRect(0, 0, 400, 150);
  };

  /* =======================
     SEND EMAIL
  ======================= */
  const sendEmail = async () => {
    const html = `
      <h2>Driver Registered</h2>
      <p><strong>Name:</strong> ${form.name}</p>
      <p><strong>Location:</strong> ${form.city}, ${form.state}, ${form.country}</p>
      <hr/>
      <p><strong>Your PIN:</strong></p>
      <h1>${form.pin}</h1>
    `;

    const res = await fetch(EMAIL_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: form.email,
        subject: "Your Driver Access PIN",
        html,
      }),
    });

    if (!res.ok) throw new Error("Email failed");
  };

  /* =======================
     SUBMIT
  ======================= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (
      !form.name ||
      !form.email ||
      !form.country ||
      !form.state ||
      !form.county ||
      !form.city
    ) {
      setError("All fields are required");
      return;
    }

    const signature = canvasRef.current?.toDataURL("image/png");
    if (!signature) {
      setError("Signature is required");
      return;
    }

    try {
      setLoading(true);

      // 🔒 PIN único
      const q = query(
        collection(db, "deliveryDrivers"),
        where("pin", "==", form.pin)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        setError("PIN collision, refresh and try again");
        return;
      }

      await addDoc(collection(db, "deliveryDrivers"), {
        ...form,
        signature,
        active: true,
        createdAt: serverTimestamp(),
      });

      await sendEmail();
      router.push("/delivery-driver/login");
    } catch (err) {
      console.error(err);
      setError("Error registering driver");
    } finally {
      setLoading(false);
    }
  };

  /* =======================
     UI
  ======================= */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow-md w-full max-w-lg space-y-4"
      >
        <h1 className="text-2xl font-bold text-center">
          Register Driver
        </h1>

        <input
          name="name"
          placeholder="Full name"
          value={form.name}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
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

        {/* STATE / PROVINCE */}
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

        <input
          name="county"
          placeholder="County / Parish"
          value={form.county}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <input
          name="city"
          placeholder="City"
          value={form.city}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <input
          value={form.pin}
          disabled
          className="w-full border p-2 rounded bg-gray-100 text-center tracking-widest"
        />

        {/* ✍️ SIGNATURE */}
        <div>
          <p className="text-sm font-medium mb-1">
            Signature (finger or mouse)
          </p>
          <canvas
            ref={canvasRef}
            width={400}
            height={150}
            className="border rounded w-full touch-none"
            onMouseDown={startDraw}
            onMouseMove={drawLine}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={drawLine}
            onTouchEnd={endDraw}
          />
          <button
            type="button"
            onClick={clearSignature}
            className="text-sm text-red-600 mt-2"
          >
            Clear signature
          </button>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-600 text-white py-3 rounded"
        >
          {loading ? "Saving..." : "Register Driver"}
        </button>
      </form>
    </div>
  );
}
