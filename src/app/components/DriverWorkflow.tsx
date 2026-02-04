"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";
import {
  doc,
  writeBatch
} from "firebase/firestore";
import { db } from "../firebase";
import SignaturePad from "./SignaturePad";

export default function DriverWorkflow({ order, allPumps, user }: any) {
  const [step, setStep] = useState(
    order.status === "picked_up" ? "delivery" : "pickup"
  );
  const [sign, setSign] = useState("");
  const [sign2, setSign2] = useState("");
  const [debtStatus, setDebtStatus] = useState<Record<string, "collected" | "missing" | null>>({});
  const [missingReasons, setMissingReasons] = useState<Record<string, string>>({});

  const pendingReturns = allPumps.filter(
    (p: any) =>
      p.status === "with_driver" &&
      p.currentDriverId === user.id &&
      p.pharmacyId === order.pharmacyId
  );

  const clientDebts = allPumps.filter(
    (p: any) =>
      p.currentClientId === order.clientId &&
      p.status === "with_client"
  );

  const allDebtsHandled = clientDebts.every(
    (d: any) =>
      debtStatus[d.id] === "collected" ||
      (debtStatus[d.id] === "missing" && missingReasons[d.id])
  );

  const action = async () => {
    if (!sign) return;

    const b = writeBatch(db);

    if (step === "pickup") {
      if (pendingReturns.length > 0) {
        pendingReturns.forEach((p: any) => {
          b.update(doc(db, "pumps", p.id), {
            status: "available",
            currentDriverId: null,
            lastReview: new Date().toLocaleString()
          });
        });

        b.update(doc(db, "deliveries", order.id), {
          driverReturnedPumps: pendingReturns.map((p: any) => p.id)
        });
      }

      b.update(doc(db, "deliveries", order.id), {
        status: "picked_up",
        pharmacyStaff: sign,
        signatureDriverPickup: sign
      });

      order.pumps.forEach((p: any) => {
        b.update(doc(db, "pumps", p.pumpId), {
          status: "with_driver",
          currentDriverId: user.id
        });
      });

      await b.commit();
      setStep("delivery");
      setSign("");
      return;
    }

    if (!sign2) return;

    const returnedIds = clientDebts
      .filter((d: any) => debtStatus[d.id] === "collected")
      .map((d: any) => d.id);

    const failedReturns = clientDebts
      .filter((d: any) => debtStatus[d.id] === "missing")
      .map((d: any) => ({
        pumpId: d.id,
        code: d.code,
        reason: missingReasons[d.id]
      }));

    b.update(doc(db, "deliveries", order.id), {
      status: "delivered",
      receiverName: "Client",
      signatureDriverDelivery: sign,
      signatureClient: sign2,
      returnedPumpIds: returnedIds,
      failedReturns
    });

    order.pumps.forEach((p: any) => {
      b.update(doc(db, "pumps", p.pumpId), {
        status: "with_client",
        currentClientId: order.clientId,
        currentDriverId: null,
        deliveredBy: user.name
      });
    });

    returnedIds.forEach((id: string) => {
      b.update(doc(db, "pumps", id), {
        status: "with_driver",
        currentClientId: null,
        currentDriverId: user.id
      });
    });

    await b.commit();
    setSign("");
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="bg-slate-900 p-8 pt-12 rounded-b-[3rem] text-white shadow-xl">
        <h2 className="text-2xl font-black italic">
          ORDER #{order.orderCode}
        </h2>
        <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mt-2">
          {step === "pickup" ? "PHARMACY PICKUP" : "HOME DELIVERY"}
        </p>
      </div>

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {step === "pickup" ? (
          <>
            {pendingReturns.length > 0 && (
              <div className="bg-amber-100 p-4 rounded-2xl border-2 border-amber-300">
                <p className="text-[12px] font-black text-amber-700 uppercase flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  RETURN TO PHARMACY
                </p>
                <div className="flex flex-wrap gap-2">
                  {pendingReturns.map((p: any) => (
                    <span
                      key={p.id}
                      className="bg-white text-amber-800 px-3 py-1 rounded-lg text-xs font-bold"
                    >
                      S/N: {p.code}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <SignaturePad onSave={setSign} label="Pharmacy Staff Signature" />
          </>
        ) : (
          <>
            {clientDebts.map((p: any) => (
              <div key={p.id} className="p-4 rounded-2xl border space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold">S/N: {p.code}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setDebtStatus({ ...debtStatus, [p.id]: "collected" })
                      }
                      className="p-2 bg-emerald-500 text-white rounded-lg"
                    >
                      <CheckCircle />
                    </button>
                    <button
                      onClick={() =>
                        setDebtStatus({ ...debtStatus, [p.id]: "missing" })
                      }
                      className="p-2 bg-red-500 text-white rounded-lg"
                    >
                      <XCircle />
                    </button>
                  </div>
                </div>

                {debtStatus[p.id] === "missing" && (
                  <input
                    className="w-full bg-red-50 p-2 rounded-lg text-xs"
                    placeholder="Reason..."
                    onChange={(e) =>
                      setMissingReasons({
                        ...missingReasons,
                        [p.id]: e.target.value
                      })
                    }
                  />
                )}
              </div>
            ))}

            <SignaturePad onSave={setSign} label="Driver Signature" />
            <SignaturePad onSave={setSign2} label="Client Signature" />
          </>
        )}
      </div>

      <div className="p-4 border-t">
        <button
          onClick={action}
          disabled={
            (step === "pickup" && !sign) ||
            (step === "delivery" && (!sign || !sign2 || !allDebtsHandled))
          }
          className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase disabled:opacity-50"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
