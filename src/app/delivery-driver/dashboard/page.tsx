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
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* =======================
   TYPES
======================= */
type Delivery = {
  id: string;
  orderCode: string;
  clientName: string;
  createdByEmployee?: string;
  pumps: number[];
  status: "pending" | "accepted" | "picked_up" | "delivered";

  pickedUpAt?: any;
  deliveredAt?: any;

  pharmacySignature?: string;
  pickupDriverSignature?: string;

  receiverName?: string;
  receiverRole?: string;
  clientSignature?: string;
  deliveryDriverSignature?: string;
};

/* =======================
   HELPERS
======================= */
const formatDate = (ts: any) => {
  if (!ts?.toDate) return "-";
  return ts.toDate().toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
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
      const list: Delivery[] = [];
      let current: Delivery | null = null;

      snap.forEach((d) => {
        const data = { id: d.id, ...d.data() } as Delivery;
        if (data.status === "accepted" || data.status === "picked_up") {
          current = data;
        } else {
          list.push(data);
        }
      });

      setDeliveries(list);
      setActive(current);
    });
  }, []);

  /* =======================
     ACTIONS
  ======================= */
  const acceptDelivery = async (d: Delivery) => {
    await updateDoc(doc(db, "deliveries", d.id), {
      status: "accepted",
    });
  };

  const confirmPickup = async () => {
    if (!active) return;

    const pharmacySignature = pharmacySig.getImage();
    const driverSignature = pickupDriverSig.getImage();

    if (!pharmacySignature || !driverSignature) {
      alert("Both pharmacy and driver signatures are required");
      return;
    }

    await updateDoc(doc(db, "deliveries", active.id), {
      status: "picked_up",
      pharmacySignature,
      pickupDriverSignature: driverSignature,
      pickedUpAt: serverTimestamp(),
    });
  };

  const confirmDelivery = async () => {
    if (!active) return;

    if (!receiverName || !receiverRole) {
      alert("Receiver name and role are required");
      return;
    }

    const clientSignature = clientSig.getImage();
    const driverSignature = deliveryDriverSig.getImage();

    if (!clientSignature || !driverSignature) {
      alert("Both client and driver signatures are required");
      return;
    }

    await updateDoc(doc(db, "deliveries", active.id), {
      status: "delivered",
      receiverName,
      receiverRole,
      clientSignature,
      deliveryDriverSignature: driverSignature,
      deliveredAt: serverTimestamp(),
    });

    setReceiverName("");
    setReceiverRole("");
  };

  /* =======================
     UI
  ======================= */
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Driver Dashboard</h1>

      {active && (
        <div className="border p-4 rounded space-y-3">
          <h2 className="font-semibold text-lg">Current Delivery</h2>

          <p><b>Order:</b> {active.orderCode}</p>
          <p><b>Client:</b> {active.clientName}</p>
          <p><b>Created by employee:</b> {active.createdByEmployee}</p>
          <p><b>Pumps:</b> {active.pumps.join(", ")}</p>
          <p><b>Status:</b> {active.status}</p>

          <p><b>Picked up at:</b> {formatDate(active.pickedUpAt)}</p>
          <p><b>Delivered at:</b> {formatDate(active.deliveredAt)}</p>

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
                onMouseLeave={pharmacySig.end}
                onTouchStart={pharmacySig.start}
                onTouchMove={pharmacySig.move}
                onTouchEnd={pharmacySig.end}
              />
              <button onClick={pharmacySig.clear} className="text-red-600 text-sm">Clear</button>

              <p className="font-semibold">Driver Signature</p>
              <canvas
                ref={pickupDriverSig.canvasRef}
                width={400}
                height={150}
                className="border"
                onMouseDown={pickupDriverSig.start}
                onMouseMove={pickupDriverSig.move}
                onMouseUp={pickupDriverSig.end}
                onMouseLeave={pickupDriverSig.end}
                onTouchStart={pickupDriverSig.start}
                onTouchMove={pickupDriverSig.move}
                onTouchEnd={pickupDriverSig.end}
              />
              <button onClick={pickupDriverSig.clear} className="text-red-600 text-sm">Clear</button>

              <button
                onClick={confirmPickup}
                className="w-full bg-orange-600 text-white py-2 rounded"
              >
                Confirm Pickup (WITH SIGNATURES)
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
                placeholder="Receiver role / occupation"
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
                onMouseLeave={clientSig.end}
                onTouchStart={clientSig.start}
                onTouchMove={clientSig.move}
                onTouchEnd={clientSig.end}
              />
              <button onClick={clientSig.clear} className="text-red-600 text-sm">Clear</button>

              <p className="font-semibold">Driver Signature</p>
              <canvas
                ref={deliveryDriverSig.canvasRef}
                width={400}
                height={150}
                className="border"
                onMouseDown={deliveryDriverSig.start}
                onMouseMove={deliveryDriverSig.move}
                onMouseUp={deliveryDriverSig.end}
                onMouseLeave={deliveryDriverSig.end}
                onTouchStart={deliveryDriverSig.start}
                onTouchMove={deliveryDriverSig.move}
                onTouchEnd={deliveryDriverSig.end}
              />
              <button onClick={deliveryDriverSig.clear} className="text-red-600 text-sm">Clear</button>

              <button
                onClick={confirmDelivery}
                className="w-full bg-green-600 text-white py-2 rounded"
              >
                Confirm Delivery (WITH SIGNATURES)
              </button>
            </>
          )}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="font-semibold">Available Deliveries</h2>
        {deliveries.length === 0 && <p>No deliveries available</p>}
        {deliveries.map((d) => (
          <div key={d.id} className="border p-3 rounded">
            <p>{d.orderCode}</p>
            <button
              onClick={() => acceptDelivery(d)}
              className="bg-blue-600 text-white px-4 py-1 rounded"
            >
              Accept
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
