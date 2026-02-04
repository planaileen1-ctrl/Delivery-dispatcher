"use client";

import { useState } from "react";
import { writeBatch, doc } from "firebase/firestore";
import { db } from "../firebase";
import SignaturePad from "./SignaturePad";

export default function ReturnPumpsForm({ pumps, pharmacyId, onFinish }: any) {
  const [selected, setSelected] = useState<string[]>([]);
  const [sign1, setSign1] = useState("");
  const [sign2, setSign2] = useState("");

  const withDriver = pumps.filter(
    (p: any) => p.status === "with_driver" && p.pharmacyId === pharmacyId
  );

  const submit = async () => {
    const b = writeBatch(db);
    selected.forEach((id) =>
      b.update(doc(db, "pumps", id), {
        status: "available",
        currentDriverId: null,
      })
    );
    await b.commit();
    onFinish();
  };

  return (
    <div className="space-y-6 p-4">
      {withDriver.map((p: any) => (
        <div key={p.id} onClick={() => setSelected([...selected, p.id])}>
          {p.code}
        </div>
      ))}

      <SignaturePad onSave={setSign1} label="Driver Signature" />
      <SignaturePad onSave={setSign2} label="Staff Signature" />

      <button onClick={submit} disabled={!sign1 || !sign2}>
        Confirm
      </button>
    </div>
  );
}
