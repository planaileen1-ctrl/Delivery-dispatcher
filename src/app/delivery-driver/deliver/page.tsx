"use client";

import { useEffect, useRef, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* =======================
   CONFIG
======================= */
const DRIVER_ID = "driver_demo_001";
const EMAIL_FUNCTION_URL =
  "https://us-central1-delivery-dispatcher-f11cc.cloudfunctions.net/sendEmail";

/* =======================
   TYPES
======================= */
type Delivery = {
  id: string;
  orderCode: string;
  clientName: string;
  city: string;
};

/* =======================
   HELPERS
======================= */
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
export default function DeliverToClientPage() {
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [receiverName, setReceiverName] = useState("");
  const [receiverRole, setReceiverRole] = useState("");
  const [signedAtUS, setSignedAtUS] = useState("");

  /* =======================
     SIGNATURES
  ======================= */
  const recCanvasRef = useRef<HTMLCanvasElement>(null);
  const drvCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const recSigned = useRef(false);
  const drvSigned = useRef(false);

  /* =======================
     LOAD ACTIVE DELIVERY
  ======================= */
  useEffect(() => {
    const q = query(
      collection(db, "deliveries"),
      where("driverId", "==", DRIVER_ID),
      where("status", "==", "picked_up")
    );

    return onSnapshot(q, (snap) => {
      if (snap.empty) {
        setDelivery(null);
        return;
      }

      const d = snap.docs[0];
      const data = d.data();

      setSignedAtUS(formatUSDate(new Date()));

      setDelivery({
        id: d.id,
        orderCode: data.orderCode,
        clientName: data.clientName,
        city: data.city,
      });
    });
  }, []);

  /* =======================
     DRAW HELPERS
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
     CONFIRM DELIVERY
  ======================= */
  const confirmDelivery = async () => {
    if (!delivery) return;

    if (!receiverName || !receiverRole) {
      alert("Complete nombre y cargo del receptor");
      return;
    }

    if (!recSigned.current || !drvSigned.current) {
      alert("Faltan firmas");
      return;
    }

    const recSignature =
      recCanvasRef.current!.toDataURL("image/png");
    const drvSignature =
      drvCanvasRef.current!.toDataURL("image/png");

    await updateDoc(doc(db, "deliveries", delivery.id), {
      status: "delivered",
      deliveredAt: serverTimestamp(),
      deliveryReceipt: {
        receiverName,
        receiverRole,
        receiverSignature: recSignature,
        driverSignature: drvSignature,
        deliveredAtUS: signedAtUS,
      },
    });

    /* 📧 EMAIL FINAL */
    const html = `
      <h2>✅ Delivery Completed</h2>
      <p><b>Order:</b> ${delivery.orderCode}</p>
      <p><b>Client:</b> ${delivery.clientName}</p>
      <p><b>City:</b> ${delivery.city}</p>
      <p><b>Received by:</b> ${receiverName} (${receiverRole})</p>
      <p><b>Date & Time:</b> ${signedAtUS}</p>
      <h3>Signatures</h3>
      <p><b>Receiver</b></p>
      <img src="${recSignature}" width="250"/>
      <p><b>Driver</b></p>
      <img src="${drvSignature}" width="250"/>
    `;

    await fetch(EMAIL_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: ["cliente@email.com", "farmacia@email.com"],
        subject: `Delivery Completed - ${delivery.orderCode}`,
        html,
      }),
    });

    alert("Entrega completada y recibo enviado");
  };

  /* =======================
     UI
  ======================= */
  if (!delivery) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-lg font-medium">
          No hay entregas en curso
        </h2>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">
        Entrega al cliente
      </h1>

      <p><b>Order:</b> {delivery.orderCode}</p>
      <p><b>Client:</b> {delivery.clientName}</p>
      <p><b>City:</b> {delivery.city}</p>
      <p><b>Date & Time:</b> {signedAtUS}</p>

      <input
        placeholder="Nombre del receptor"
        value={receiverName}
        onChange={(e) => setReceiverName(e.target.value)}
        className="w-full border p-2 rounded"
      />

      <input
        placeholder="Cargo del receptor"
        value={receiverRole}
        onChange={(e) => setReceiverRole(e.target.value)}
        className="w-full border p-2 rounded"
      />

      <p className="font-medium">Firma receptor</p>
      <canvas
        ref={recCanvasRef}
        width={400}
        height={120}
        className="border w-full"
        onMouseDown={startDraw(recCanvasRef, recSigned)}
        onMouseMove={drawLine(recCanvasRef)}
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
        onClick={confirmDelivery}
        className="bg-green-700 text-white px-6 py-2 rounded w-full"
      >
        Confirmar entrega final
      </button>
    </div>
  );
}
