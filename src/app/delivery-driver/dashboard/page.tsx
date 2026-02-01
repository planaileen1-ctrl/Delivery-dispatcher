"use client";

import { useEffect, useRef, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* =======================
   TYPES
======================= */
type Delivery = {
  id: string;
  orderCode: string;
  clientName: string;
  city: string;
  pharmacyId: string;
  createdByName: string;
};

type PharmacyEmployee = {
  id: string;
  name: string;
};

/* =======================
   CONFIG (temporal)
======================= */
const DRIVER_ID = "driver_demo_001";
const EMAIL_FUNCTION_URL =
  "https://us-central1-delivery-dispatcher-f11cc.cloudfunctions.net/sendEmail";

/* =======================
   HELPERS
======================= */
const safe = (v?: string) =>
  v && v.trim() !== "" ? v : "—";

const formatUSDate = (d: Date) =>
  d.toLocaleString("en-US", {
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
export default function DriverDashboard() {
  const [available, setAvailable] = useState<Delivery[]>([]);
  const [active, setActive] = useState<Delivery | null>(null);
  const [employees, setEmployees] = useState<PharmacyEmployee[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [signedAtUS, setSignedAtUS] = useState("");

  /* =======================
     SIGNATURE STATE
  ======================= */
  const empCanvasRef = useRef<HTMLCanvasElement>(null);
  const drvCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const empSigned = useRef(false);
  const drvSigned = useRef(false);

  /* =======================
     AVAILABLE DELIVERIES
  ======================= */
  useEffect(() => {
    const q = query(
      collection(db, "deliveries"),
      where("status", "==", "created")
    );

    return onSnapshot(q, (snap) => {
      setAvailable(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            orderCode: safe(data.orderCode),
            clientName: safe(data.clientName),
            city: safe(data.city),
            pharmacyId: data.pharmacyId,
            createdByName: safe(
              data.createdBy?.employeeName
            ),
          };
        })
      );
    });
  }, []);

  /* =======================
     ACTIVE DELIVERY
  ======================= */
  useEffect(() => {
    const q = query(
      collection(db, "deliveries"),
      where("driverId", "==", DRIVER_ID),
      where("status", "==", "accepted")
    );

    return onSnapshot(q, (snap) => {
      if (snap.empty) {
        setActive(null);
        return;
      }

      const d = snap.docs[0];
      const data = d.data();

      setSignedAtUS(formatUSDate(new Date()));

      setActive({
        id: d.id,
        orderCode: safe(data.orderCode),
        clientName: safe(data.clientName),
        city: safe(data.city),
        pharmacyId: data.pharmacyId,
        createdByName: safe(
          data.createdBy?.employeeName
        ),
      });
    });
  }, []);

  /* =======================
     LOAD EMPLOYEES
  ======================= */
  useEffect(() => {
    if (!active?.pharmacyId) return;

    const loadEmployees = async () => {
      const snap = await getDocs(
        query(
          collection(db, "pharmacyEmployees"),
          where("pharmacyId", "==", active.pharmacyId),
          where("active", "==", true)
        )
      );

      setEmployees(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name,
        }))
      );
    };

    loadEmployees();
  }, [active?.pharmacyId]);

  /* =======================
     ACCEPT DELIVERY
  ======================= */
  const acceptDelivery = async (d: Delivery) => {
    await updateDoc(doc(db, "deliveries", d.id), {
      status: "accepted",
      driverId: DRIVER_ID,
      acceptedAt: serverTimestamp(),
    });
  };

  /* =======================
     SIGNATURE LOGIC
  ======================= */
  const getPoint = (e: any, c: HTMLCanvasElement) => {
    const r = c.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - r.left, y: p.clientY - r.top };
  };

  const startDraw =
    (
      ref: React.RefObject<HTMLCanvasElement>,
      signed: React.MutableRefObject<boolean>
    ) =>
    (e: any) => {
      e.preventDefault();
      const canvas = ref.current!;
      const ctx = canvas.getContext("2d")!;
      const { x, y } = getPoint(e, canvas);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      drawing.current = true;
      signed.current = true;
    };

  const drawLine =
    (ref: React.RefObject<HTMLCanvasElement>) =>
    (e: any) => {
      if (!drawing.current) return;
      e.preventDefault();
      const canvas = ref.current!;
      const ctx = canvas.getContext("2d")!;
      const { x, y } = getPoint(e, canvas);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

  const endDraw = () => {
    drawing.current = false;
  };

  /* =======================
     CONFIRM PICKUP + EMAIL
  ======================= */
  const confirmPickup = async () => {
    if (!active) return;

    if (!employeeId) {
      alert("Seleccione la empleada");
      return;
    }

    if (!empSigned.current || !drvSigned.current) {
      alert("Faltan firmas");
      return;
    }

    const empSignature =
      empCanvasRef.current!.toDataURL("image/png");
    const drvSignature =
      drvCanvasRef.current!.toDataURL("image/png");

    await updateDoc(doc(db, "deliveries", active.id), {
      status: "picked_up",
      pickedUpAt: serverTimestamp(),
      pharmacyHandoff: {
        employeeId,
        employeeSignature: empSignature,
        driverSignature: drvSignature,
        signedAtUS,
        signedAt: serverTimestamp(),
      },
    });

    /* 📧 SEND RECEIPT EMAIL (PRUEBA) */
    const pharmacyEmail = "tuemail@gmail.com";
    const driverEmail = "tuemail@gmail.com";

    const receiptHtml = `
      <div style="font-family: Arial, sans-serif">
        <h2>📦 Pickup Receipt</h2>
        <p><b>Order:</b> ${active.orderCode}</p>
        <p><b>Client:</b> ${active.clientName}</p>
        <p><b>City:</b> ${active.city}</p>
        <p><b>Date & Time:</b> ${signedAtUS}</p>

        <h3>Signatures</h3>
        <p><b>Pharmacy</b></p>
        <img src="${empSignature}" width="250"/>
        <p><b>Driver</b></p>
        <img src="${drvSignature}" width="250"/>
      </div>
    `;

    await fetch(EMAIL_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: [pharmacyEmail, driverEmail],
        subject: `Pickup Receipt - ${active.orderCode}`,
        html: receiptHtml,
      }),
    });

    alert("Entrega confirmada y recibo enviado");
  };

  /* =======================
     UI
  ======================= */
  if (active) {
    return (
      <div className="p-6 max-w-xl mx-auto space-y-4">
        <h1 className="text-xl font-bold">
          Entrega en farmacia
        </h1>

        <p><b>Order:</b> {active.orderCode}</p>
        <p><b>Client:</b> {active.clientName}</p>
        <p><b>City:</b> {active.city}</p>
        <p><b>Created by:</b> {active.createdByName}</p>
        <p><b>Date & Time:</b> {signedAtUS}</p>

        <select
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className="w-full border p-2 rounded"
        >
          <option value="">Select employee</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>

        <p className="font-medium">Firma empleada</p>
        <canvas
          ref={empCanvasRef}
          width={400}
          height={120}
          className="border w-full"
          onMouseDown={startDraw(empCanvasRef, empSigned)}
          onMouseMove={drawLine(empCanvasRef)}
          onMouseUp={endDraw}
        />

        <p className="font-medium">Firma conductor</p>
        <canvas
          ref={drvCanvasRef}
          width={400}
          height={120}
          className="border w-full"
          onMouseDown={startDraw(drvCanvasRef, drvSigned)}
          onMouseMove={drawLine(drvCanvasRef)}
          onMouseUp={endDraw}
        />

        <button
          onClick={confirmPickup}
          className="bg-green-600 text-white px-6 py-2 rounded"
        >
          Confirmar retiro
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        Available Deliveries
      </h1>

      {available.map((d) => (
        <div
          key={d.id}
          className="border p-4 rounded mb-3 flex justify-between"
        >
          <div>
            <p><b>Order:</b> {d.orderCode}</p>
            <p><b>Client:</b> {d.clientName}</p>
            <p><b>City:</b> {d.city}</p>
            <p><b>Created by:</b> {d.createdByName}</p>
          </div>

          <button
            onClick={() => acceptDelivery(d)}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Accept
          </button>
        </div>
      ))}
    </div>
  );
}
