"use client";

import { useState } from "react";
import { addDoc } from "firebase/firestore";
import { getCollectionRef } from "@/lib/firestore";
import { X } from "lucide-react";

export default function AddAssetForm({
  pharmacyId,
  onFinish,
}: {
  pharmacyId: string;
  onFinish: () => void;
}) {
  const [f, setF] = useState({ code: "", brand: "", model: "" });

  const save = async () => {
    if (!f.code) return;
    await addDoc(getCollectionRef("pumps"), {
      ...f,
      status: "available",
      lastReview: new Date().toLocaleString(),
      pharmacyId,
    });
    onFinish();
  };

  return (
    <div className="space-y-6 text-left text-slate-900">
      <div className="flex justify-between items-center">
        <h3 className="font-black text-lg uppercase">New Equipment</h3>
        <button onClick={onFinish} className="text-slate-400">
          <X />
        </button>
      </div>

      <div className="space-y-4">
        <input
          className="w-full p-4 bg-white border rounded-xl font-bold"
          placeholder="Serial Number (S/N)"
          onChange={(e) => setF({ ...f, code: e.target.value })}
        />
        <input
          className="w-full p-4 bg-white border rounded-xl font-bold"
          placeholder="Brand"
          onChange={(e) => setF({ ...f, brand: e.target.value })}
        />
        <input
          className="w-full p-4 bg-white border rounded-xl font-bold"
          placeholder="Model"
          onChange={(e) => setF({ ...f, model: e.target.value })}
        />

        <button
          onClick={save}
          className="w-full bg-[#0f172a] text-white py-4 rounded-2xl font-black uppercase text-xs"
        >
          Register Asset
        </button>
      </div>
    </div>
  );
}
