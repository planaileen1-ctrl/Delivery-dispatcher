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

const EMAIL_FUNCTION_URL =
  "https://us-central1-delivery-dispatcher-f11cc.cloudfunctions.net/sendEmail";

/* =======================
   HELPERS
======================= */
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

  /* =======================
     FORM
  ======================= */
  const [pharmacyPin, setPharmacyPin] = useState("");
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
     SIGNATURE
  ======================= */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const getPoint = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();

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

  const startDraw = (e: any) => {
    e.preventDefault();
    const { x, y } = getPoint(e);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawing.current = true;
  };

  const drawLine = (e: any) => {
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
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  /* =======================
     SUBMIT
  ======================= */
  const handleSubmit = async () => {
    setError("");

    if (
      pharmacyPin.length !== 4 ||
      !form.name ||
      !form.email
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

      /* =======================
         VALIDATE PHARMACY PIN
      ======================= */
      const pharmacySnap = await getDocs(
        query(
          collection(db, "pharmacies"),
          where("pin", "==", pharmacyPin)
        )
      );

      if (pharmacySnap.empty) {
        setError("Invalid pharmacy PIN");
        return;
      }

      const pharmacyDoc = pharmacySnap.docs[0];
      const pharmacyData = pharmacyDoc.data();

      if (pharmacyData.suspended) {
        setError("This pharmacy is suspended");
        return;
      }

      /* =======================
         CREATE EMPLOYEE
      ======================= */
      await addDoc(collection(db, "pharmacyEmployees"), {
        pharmacyId: pharmacyDoc.id, // 🔑 CLAVE
        name: form.name,
        email: form.email,
        pin: form.pin,
        employeeCode: form.employeeCode,
        signature,
        active: true,
        createdAtUS: form.createdAtUS,
        createdAt: serverTimestamp(),
      });

      /* =======================
         EMAIL
      ======================= */
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
            <p><strong>Pharmacy:</strong> ${pharmacyData.name}</p>
            <p><strong>Date:</strong> ${form.createdAtUS}</p>
            <hr/>
            <p><strong>Employee PIN:</strong></p>
            <h1>${form.pin}</h1>
          `,
        }),
      });

      router.push("/pharmacy/login");
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
          placeholder="Pharmacy PIN"
          value={pharmacyPin}
          maxLength={4}
          onChange={(e) =>
            setPharmacyPin(e.target.value.replace(/\D/g, ""))
          }
          className="w-full border p-2 rounded text-center tracking-widest"
        />

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
