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
  pumps: string[];
};

type PharmacyEmployee = {
  id: string;
  name: string;
};

/* =======================
   CONFIG
======================= */
const DRIVER_ID = "driver_demo_001";

/* =======================
   HELPERS
======================= */
const safe = (v?: string) => (v && v.trim() !== "" ? v : "—");

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
  const [pickup, setPickup] = useState<Delivery | null>(null);
  const [delivering, setDelivering] = useState<Delivery | null>(null);

  const [employees, setEmployees] = useState<PharmacyEmployee[]>([]);
  const [employeeId, setEmployeeId] = useState("");

  const [receiverName, setReceiverName] = useState("");
  const [receiverRole, setReceiverRole] = useState("");

  const [nowUS, setNowUS] = useState(formatUSDate(new Date()));

  /* =======================
     SIGNATURE CANVAS
  ======================= */
  const empCanvasRef = useRef<HTMLCanvasElement>(null);
  const drvCanvasRef = useRef<HTMLCanvasElement>(null);
  const recvCanvasRef = useRef<HTMLCanvasElement>(null);

  const drawing = useRef(false);
  const empSigned = useRef(false);
  const drvSigned = useRef(false);
  const recvSigned = useRef(false);

  /* =======================
     CLOCK
  ======================= */
  useEffect(() => {
    const t = setInterval(
      () => setNowUS(formatUSDate(new Date())),
      60000
    );
    return () => clearInterval(t);
  }, []);

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
            createdByName: safe(data.createdBy?.employeeName),
            pumps: data.pumps || [],
          };
        })
      );
    });
  }, []);

  /* =======================
     PICKUP (accepted)
  ======================= */
  useEffect(() => {
    const q = query(
      collection(db, "deliveries"),
      where("driverId", "==", DRIVER_ID),
      where("status", "==", "accepted")
    );

    return onSnapshot(q, (snap) => {
      if (snap.empty) {
        setPickup(null);
        return;
      }

      const d = snap.docs[0];
      const data = d.data();

      setPickup({
        id: d.id,
        orderCode: safe(data.orderCode),
        clientName: safe(data.clientName),
        city: safe(data.city),
        pharmacyId: data.pharmacyId,
        createdByName: safe(data.createdBy?.employeeName),
        pumps: data.pumps || [],
      });
    });
  }, []);

  /* =======================
     DELIVERING (picked_up)
  ======================= */
  useEffect(() => {
    const q = query(
      collection(db, "deliveries"),
      where("driverId", "==", DRIVER_ID),
      where("status", "==", "picked_up")
    );

    return onSnapshot(q, (snap) => {
      if (snap.empty) {
        setDelivering(null);
        return;
      }

      const d = snap.docs[0];
      const data = d.data();

      setDelivering({
        id: d.id,
        orderCode: safe(data.orderCode),
        clientName: safe(data.clientName),
        city: safe(data.city),
        pharmacyId: data.pharmacyId,
        createdByName: safe(data.createdBy?.employeeName),
        pumps: data.pumps || [],
      });
    });
  }, []);

  /* =======================
     LOAD EMPLOYEES
  ======================= */
  useEffect(() => {
    if (!pickup?.pharmacyId) return;

    getDocs(
      query(
        collection(db, "pharmacyEmployees"),
        where("pharmacyId", "==", pickup.pharmacyId),
        where("active", "==", true)
      )
    ).then((snap) =>
      setEmployees(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name,
        }))
      )
    );
  }, [pickup?.pharmacyId]);

  /* =======================
     DRAW HELPERS
  ======================= */
  const getPoint = (e: any, c: HTMLCanvasElement) => {
    const r = c.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - r.left, y: p.clientY - r.top };
  };

  const startDraw =
    (ref: React.RefObject<HTMLCanvasElement>, signed: any) =>
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

  const endDraw = () => (drawing.current = false);

  /* =======================
     ACTIONS
  ======================= */
  const acceptDelivery = async (d: Delivery) => {
    await updateDoc(doc(db, "deliveries", d.id), {
      status: "accepted",
      driverId: DRIVER_ID,
      acceptedAt: serverTimestamp(),
    });
  };

  const confirmPickup = async () => {
    if (!pickup || !employeeId || !empSigned.current || !drvSigned.current) {
      alert("Faltan datos o firmas");
      return;
    }

    await updateDoc(doc(db, "deliveries", pickup.id), {
      status: "picked_up",
      pickedUpAt: serverTimestamp(),
      pharmacyHandoff: {
        employeeId,
        employeeSignature:
          empCanvasRef.current!.toDataURL("image/png"),
        driverSignature:
          drvCanvasRef.current!.toDataURL("image/png"),
        signedAtUS: nowUS,
        signedAt: serverTimestamp(),
      },
    });
  };

  const confirmDelivery = async () => {
    if (
      !delivering ||
      !receiverName ||
      !receiverRole ||
      !recvSigned.current
    ) {
      alert("Faltan datos o firma del receptor");
      return;
    }

    await updateDoc(doc(db, "deliveries", delivering.id), {
      status: "delivered",
      deliveredAt: serverTimestamp(),
      clientHandoff: {
        receiverName,
        receiverRole,
        receiverSignature:
          recvCanvasRef.current!.toDataURL("image/png"),
        signedAtUS: nowUS,
        signedAt: serverTimestamp(),
      },
    });

    alert("Entrega finalizada correctamente");
  };

  /* =======================
     UI STATES
  ======================= */

  /* ---------- DELIVERY TO CLIENT ---------- */
  if (delivering) {
    return (
      <div className="p-6 max-w-xl mx-auto space-y-3">
        <h1 className="text-xl font-bold">Entrega al cliente</h1>

        <p><b>Order:</b> {delivering.orderCode}</p>
        <p><b>Client:</b> {delivering.clientName}</p>
        <p><b>City:</b> {delivering.city}</p>
        <p><b>Pumps:</b> {delivering.pumps.join(", ")}</p>
        <p><b>Date & Time:</b> {nowUS}</p>

        <input
          placeholder="Nombre receptor"
          className="w-full border p-2"
          value={receiverName}
          onChange={(e) => setReceiverName(e.target.value)}
        />

        <input
          placeholder="Cargo"
          className="w-full border p-2"
          value={receiverRole}
          onChange={(e) => setReceiverRole(e.target.value)}
        />

        <p className="font-medium">Firma receptor</p>
        <canvas
          ref={recvCanvasRef}
          width={400}
          height={120}
          className="border w-full"
          onMouseDown={startDraw(recvCanvasRef, recvSigned)}
          onMouseMove={drawLine(recvCanvasRef)}
          onMouseUp={endDraw}
        />

        <button
          onClick={confirmDelivery}
          className="bg-green-600 text-white px-6 py-2 rounded"
        >
          Confirmar entrega
        </button>
      </div>
    );
  }

  /* ---------- PICKUP ---------- */
  if (pickup) {
    return (
      <div className="p-6 max-w-xl mx-auto space-y-3">
        <h1 className="text-xl font-bold">Retiro en farmacia</h1>

        <p><b>Order:</b> {pickup.orderCode}</p>
        <p><b>Pumps:</b> {pickup.pumps.join(", ")}</p>
        <p><b>Date & Time:</b> {nowUS}</p>

        <select
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className="w-full border p-2"
        >
          <option value="">Seleccione empleada</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>

        <p>Firma empleada</p>
        <canvas
          ref={empCanvasRef}
          width={400}
          height={120}
          className="border w-full"
          onMouseDown={startDraw(empCanvasRef, empSigned)}
          onMouseMove={drawLine(empCanvasRef)}
          onMouseUp={endDraw}
        />

        <p>Firma conductor</p>
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

  /* ---------- AVAILABLE ---------- */
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Available Deliveries</h1>

      {available.length === 0 && <p>No hay deliveries</p>}

      {available.map((d) => (
        <div key={d.id} className="border p-4 rounded mb-3">
          <p><b>Order:</b> {d.orderCode}</p>
          <p><b>Client:</b> {d.clientName}</p>
          <p><b>Pumps:</b> {d.pumps.join(", ")}</p>

          <button
            onClick={() => acceptDelivery(d)}
            className="mt-2 bg-blue-600 text-white px-4 py-2 rounded"
          >
            Accept
          </button>
        </div>
      ))}
    </div>
  );
}
