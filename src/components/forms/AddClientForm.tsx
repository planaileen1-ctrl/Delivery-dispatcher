"use client";

import { useState } from "react";
import { addDoc } from "firebase/firestore";
import { getCollectionRef } from "@/lib/firestore";
import { X } from "lucide-react";

export default function AddClientForm({
  pharmacyId,
  user,
  onFinish,
}: {
  pharmacyId: string;
  user: any;
  onFinish: () => void;
}) {
  const [f, setF] = useState({
    name: "",
    email: "",
    address: "",
    city: "",
    state: "",
  });

  const save = async () => {
    if (!f.name) return;
    await addDoc(getCollectionRef("clients"), {
      ...f,
      pharmacyId,
      country: user.country || "US",
      state: user.state || "FL",
    });
    onFinish();
  };

  return (
    <div className="space-y-6 text-left text-slate-900">
      <div className="flex justify-between items-center">
        <h3 className="font-black text-lg uppercase">New Client</h3>
        <button onClick={onFinish} className="text-slate-400">
          <X />
        </button>
      </div>

      <div className="space-y-4">
        <input
          className="w-full p-4 bg-white border rounded-xl font-bold"
          placeholder="Full Client Name"
          onChange={(e) => setF({ ...f, name: e.target.value })}
        />
        <input
          className="w-full p-4 bg-white border rounded-xl font-bold"
          placeholder="Email"
          onChange={(e) => setF({ ...f, email: e.target.value })}
        />
        <input
          className="w-full p-4 bg-white border rounded-xl font-bold"
          placeholder="Street Address"
          onChange={(e) => setF({ ...f, address: e.target.value })}
        />
        <input
          className="w-full p-4 bg-white border rounded-xl font-bold"
          placeholder="City"
          onChange={(e) => setF({ ...f, city: e.target.value })}
        />

        <button
          onClick={save}
          className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-xs"
        >
          Save Client Profile
        </button>
      </div>
    </div>
  );
}
