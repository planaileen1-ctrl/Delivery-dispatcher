"use client";

import { useEffect, useRef, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
  addDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* =======================
   TYPES
======================= */
type PumpItem = {
  pumpId: string;
  code: string;
};

type Delivery = {
  id: string;
  orderCode: string;
  clientId?: string;

  createdByEmployeeId?: string;
  createdByEmployeeName?: string;

  pumps: PumpItem[];

  status: "pending" | "accepted" | "picked_up" | "delivered";

  acceptedAt?: any;
  pickedUpAt?: any;
  deliveredAt?: any;

  pharmacySignature?: string;
  pickupDriverSignature?: string;

  receiverName?: string;
  receiverRole?: string;
  clientSignature?: string;
  deliveryDriverSignature?: string;
};

type ClientInfo = {
  name?: string;
  address?: string;
  email?: string;
};

/* =======================
   HELPERS
======================= */
const formatDate = (ts: any) => {
  if (!ts?.toDate) return "-";
  return ts.toDate().toLocaleString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

/* =======================
   SIGNATURE HOOK
======================= */
function useSignatureCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const getPoint = (e: any) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
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

  const start = (e: any) => {
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawing.current = true;
  };

  const move = (e: any) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPoint(e);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = () => {
    drawing.current = false;
  };

  const clear = () => {
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.clearRect(0, 0, 400, 150);
  };

  const getImage = () =>
    canvasRef.current?.toDataURL("image/png") || "";

  return { canvasRef, start, move, end, clear, getImage };
}

/* =======================
   COMPONENT
======================= */
export default function DriverDashboardPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [active, setActive] = useState<Delivery | null>(null);
  const [clientInfo, setClientInfo] = useState<ClientInfo>({});

  const [receiverName, setReceiverName] = useState("");
  const [receiverRole, setReceiverRole] = useState("");

  const pharmacySig = useSignatureCanvas();
  const pickupDriverSig = useSignatureCanvas();
  const clientSig = useSignatureCanvas();
  const deliveryDriverSig = useSignatureCanvas();

  /* =======================
     LOAD DELIVERIES
  ======================= */
  useEffect(() => {
    const q = query(
      collection(db, "deliveries"),
      where("status", "in", ["pending", "accepted", "picked_up"])
    );

    return onSnapshot(q, (snap) => {
      const list: Delivery[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Delivery, "id">),
      }));

      setDeliveries(list);
      if (!active && list.length > 0) setActive(list[0]);
    });
  }, []);

  /* =======================
     LOAD CLIENT
  ======================= */
  useEffect(() => {
    if (!active?.clientId) return;

    const load = async () => {
      const snap = await getDoc(doc(db, "clients", active.clientId!));
      if (snap.exists()) {
        setClientInfo({
          name: snap.data().name,
          address: snap.data().address,
          email: snap.data().email,
        });
      }
    };

    load();
  }, [active?.clientId]);

  /* =======================
     ACTIONS
  ======================= */
  const acceptDelivery = async () => {
    if (!active) return;

    await updateDoc(doc(db, "deliveries", active.id), {
      status: "accepted",
      acceptedAt: serverTimestamp(),
    });

    if (clientInfo.email) {
      await addDoc(collection(db, "notifications"), {
        type: "email",
        to: clientInfo.email,
        subject: "Your order is ready",
        text: `Hello ${clientInfo.name},

Your order ${active.orderCode} is ready.
A delivery driver has been assigned and will arrive shortly.`,
        createdAt: serverTimestamp(),
      });
    }
  };

  const confirmPickup = async () => {
    if (!active) return;

    const pharmacySignature = pharmacySig.getImage();
    const driverSignature = pickupDriverSig.getImage();
    if (!pharmacySignature || !driverSignature) return;

    await updateDoc(doc(db, "deliveries", active.id), {
      status: "picked_up",
      pharmacySignature,
      pickupDriverSignature: driverSignature,
      pickedUpAt: serverTimestamp(),
    });
  };

  const confirmDelivery = async () => {
    if (!active || !receiverName || !receiverRole) return;

    const clientSignature = clientSig.getImage();
    const driverSignature = deliveryDriverSig.getImage();
    if (!clientSignature || !driverSignature) return;

    await updateDoc(doc(db, "deliveries", active.id), {
      status: "delivered",
      receiverName,
      receiverRole,
      clientSignature,
      deliveryDriverSignature: driverSignature,
      deliveredAt: serverTimestamp(),
    });

    setActive(null);
    setReceiverName("");
    setReceiverRole("");
    setClientInfo({});
  };

  /* =======================
     UI
  ======================= */
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Driver Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {deliveries.map((d) => (
          <div
            key={d.id}
            onClick={() => setActive(d)}
            className={`border p-3 rounded cursor-pointer ${
              active?.id === d.id ? "border-blue-600 bg-blue-50" : ""
            }`}
          >
            <p><b>Order:</b> {d.orderCode}</p>
            <p><b>Status:</b> {d.status}</p>
            <p><b>Pumps:</b> {d.pumps.length}</p>
          </div>
        ))}
      </div>

      {active && (
        <div className="border p-4 rounded space-y-3">
          <h2 className="font-semibold text-lg">Current Delivery</h2>

          <p><b>Order:</b> {active.orderCode}</p>
          <p><b>Client:</b> {clientInfo.name || "-"}</p>
          <p><b>Address:</b> {clientInfo.address || "-"}</p>
          <p><b>Created by:</b> {active.createdByEmployeeName || "-"}</p>

          <ul className="list-disc ml-6">
            {active.pumps.map((p, i) => (
              <li key={i}>{p.code}</li>
            ))}
          </ul>

          <p><b>Status:</b> {active.status}</p>
          <p><b>Accepted:</b> {formatDate(active.acceptedAt)}</p>
          <p><b>Picked up:</b> {formatDate(active.pickedUpAt)}</p>
          <p><b>Delivered:</b> {formatDate(active.deliveredAt)}</p>

          {active.status === "pending" && (
            <button
              onClick={acceptDelivery}
              className="w-full bg-blue-600 text-white py-2 rounded"
            >
              Accept Delivery
            </button>
          )}

          {active.status === "accepted" && (
            <>
              <p className="font-semibold">Pharmacy Signature</p>
              <canvas
                ref={pharmacySig.canvasRef}
                width={400}
                height={150}
                className="border"
                onMouseDown={pharmacySig.start}
                onMouseMove={pharmacySig.move}
                onMouseUp={pharmacySig.end}
                onTouchStart={pharmacySig.start}
                onTouchMove={pharmacySig.move}
                onTouchEnd={pharmacySig.end}
              />
              <button onClick={pharmacySig.clear} className="text-red-600 text-sm">
                Clear pharmacy signature
              </button>

              <p className="font-semibold">Pickup Driver Signature</p>
              <canvas
                ref={pickupDriverSig.canvasRef}
                width={400}
                height={150}
                className="border"
                onMouseDown={pickupDriverSig.start}
                onMouseMove={pickupDriverSig.move}
                onMouseUp={pickupDriverSig.end}
                onTouchStart={pickupDriverSig.start}
                onTouchMove={pickupDriverSig.move}
                onTouchEnd={pickupDriverSig.end}
              />
              <button onClick={pickupDriverSig.clear} className="text-red-600 text-sm">
                Clear driver signature
              </button>

              <button
                onClick={confirmPickup}
                className="w-full bg-orange-600 text-white py-2 rounded"
              >
                Confirm Pickup
              </button>
            </>
          )}

          {active.status === "picked_up" && (
            <>
              <input
                placeholder="Receiver name"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                className="border p-2 w-full"
              />
              <input
                placeholder="Receiver role"
                value={receiverRole}
                onChange={(e) => setReceiverRole(e.target.value)}
                className="border p-2 w-full"
              />

              <p className="font-semibold">Client Signature</p>
              <canvas
                ref={clientSig.canvasRef}
                width={400}
                height={150}
                className="border"
                onMouseDown={clientSig.start}
                onMouseMove={clientSig.move}
                onMouseUp={clientSig.end}
                onTouchStart={clientSig.start}
                onTouchMove={clientSig.move}
                onTouchEnd={clientSig.end}
              />
              <button onClick={clientSig.clear} className="text-red-600 text-sm">
                Clear client signature
              </button>

              <p className="font-semibold">Delivery Driver Signature</p>
              <canvas
                ref={deliveryDriverSig.canvasRef}
                width={400}
                height={150}
                className="border"
                onMouseDown={deliveryDriverSig.start}
                onMouseMove={deliveryDriverSig.move}
                onMouseUp={deliveryDriverSig.end}
                onTouchStart={deliveryDriverSig.start}
                onTouchMove={deliveryDriverSig.move}
                onTouchEnd={deliveryDriverSig.end}
              />
              <button onClick={deliveryDriverSig.clear} className="text-red-600 text-sm">
                Clear driver signature
              </button>

              <button
                onClick={confirmDelivery}
                className="w-full bg-green-600 text-white py-2 rounded"
              >
                Confirm Delivery
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
