"use client";

import { useState } from "react";
import { writeBatch } from "firebase/firestore";
import { getDocRef } from "@/lib/firestore";
import { Order, Pump, Employee } from "@/types";
import SignaturePad from "@/components/ui/SignaturePad";

export default function DriverWorkflow({
  order,
  allPumps,
  user,
}: {
  order: Order;
  allPumps: Pump[];
  user: Employee;
}) {
  const [step, setStep] = useState(
    order.status === "picked_up" ? "delivery" : "pickup"
  );
  const [s1, setS1] = useState("");
  const [s2, setS2] = useState("");
  const [loading, setLoading] = useState(false);

  const action = async () => {
    if (!s1 || !s2) return;
    setLoading(true);
    const b = writeBatch(getDocRef("deliveries", order.id).firestore);

    if (step === "pickup") {
      b.update(getDocRef("deliveries", order.id), {
        status: "picked_up",
        signaturePharmacy: s1,
        signatureDriverPickup: s2,
      });
      order.pumps.forEach((p) =>
        b.update(getDocRef("pumps", p.pumpId), {
          status: "with_driver",
          currentDriverId: user.id,
        })
      );
    } else {
      b.update(getDocRef("deliveries", order.id), {
        status: "delivered",
        signatureDriverDelivery: s1,
        signatureClient: s2,
      });
    }

    await b.commit();
    setLoading(false);
  };

  return (
    <div className="p-4 space-y-4">
      <SignaturePad label="Signature 1" onSave={setS1} />
      <SignaturePad label="Signature 2" onSave={setS2} />
      <button
        onClick={action}
        disabled={loading}
        className="w-full bg-emerald-600 py-4 rounded-3xl font-black uppercase text-xs"
      >
        Confirm
      </button>
    </div>
  );
}
