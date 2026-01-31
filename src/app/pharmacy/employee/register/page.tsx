"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const EMAIL_FUNCTION_URL =
  "https://us-central1-delivery-dispatcher-f11cc.cloudfunctions.net/sendEmail";

const generatePin = () =>
  Math.floor(1000 + Math.random() * 9000).toString();

const generateCode = () =>
  "EMP-" + Math.random().toString(36).substring(2, 8).toUpperCase();

const formatUSDate = () =>
  new Date().toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

export default function EmployeeRegisterPage() {
  const router = useRouter();

  // 🔐 SSR-safe state
  const [pharmacy, setPharmacy] = useState<any>(null);
  const [ready, setReady] = useState(false);

  // ✍️ Signature
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  // 📋 Form
  const [form, setForm] = useState({
    name: "",
    email: "",
    pin: generatePin(),
    employeeCode: generateCode(),
    createdAtUS: formatUSDate(),
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /* =======================
     LOAD PHARMACY (CLIENT)
  ======================= */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem("pharmacy");
    if (!stored) {
      router.push("/pharmacy/login");
      return;
    }

    setPharmacy(JSON.parse(stored));
    setReady(true);
  }, [router]);

  // ⛔ block SSR render
  if (!ready) return null;

  /* =======================
     SIGNATURE HANDLERS
  ======================= */
  const startDraw = () => (drawing.current = true);
  const endDraw = () => {
    drawing.current = false;
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d")!;
      ctx.beginPath();
    }
  };

  const draw = (e: React.MouseEvent) => {
    if (!drawing.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";

    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  /* =======================
     SUBMIT
  ======================= */
  const handleSubmit = async () => {
    setError("");

    if (!form.name || !form.email) {
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

      await addDoc(collection(db, "pharmacyEmployees"), {
        pharmacyId: pharmacy.id,
        ...form,
        signature,
        active: true,
        createdAt: serverTimestamp(),
      });

      // 📧 EMAIL
      await fetch(EMAIL_FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: form.email,
          subject: "Employee Access Created",
          html: `
            <h2>Employee Registered</h2>
            <p><strong>Name:</strong> ${form.name}</p>
            <p><strong>Employee Code:</strong> ${form.employeeCode}</p>
            <p><strong>Date:</strong> ${form.createdAtUS}</p>
            <hr/>
            <p><strong>PIN:</strong></p>
            <h1>${form.pin}</h1>
          `,
        }),
      });

      router.push("/pharmacy/employee/login");
    } catch (e) {
      console.error(e);
      setError("Error registering employee");
    } finally {
      setLoading(false);
    }
  };

  /* =======================
     UI
  ======================= */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow w-full max-w-lg space-y-4">
        <h1 className="text-2xl font-bold text-center">
          Register Employee
        </h1>

        <input
          placeholder="Full name"
          value={form.name}
          onChange={(e) =>
            setForm({ ...form, name: e.target.value })
          }
          className="w-full border p-2 rounded"
        />

        <input
          placeholder="Email"
          value={form.email}
          onChange={(e) =>
            setForm({ ...form, email: e.target.value })
          }
          className="w-full border p-2 rounded"
        />

        <input
          value={form.pin}
          disabled
          className="w-full border p-2 rounded bg-gray-100 text-center tracking-widest"
        />

        {/* SIGNATURE */}
        <div>
          <p className="text-sm font-medium mb-1">
            Signature (finger or mouse)
          </p>
          <canvas
            ref={canvasRef}
            width={400}
            height={150}
            className="border rounded w-full"
            onMouseDown={startDraw}
            onMouseUp={endDraw}
            onMouseMove={draw}
          />
          <button
            onClick={clearSignature}
            className="text-sm text-red-600 mt-2"
          >
            Clear signature
          </button>
        </div>

        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-green-600 text-white py-3 rounded"
        >
          {loading ? "Saving..." : "Register Employee"}
        </button>
      </div>
    </div>
  );
}
