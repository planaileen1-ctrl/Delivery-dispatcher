"use client";

import { useState } from "react";
import { addDoc, updateDoc, getDocs, serverTimestamp } from "firebase/firestore";
import { getCollectionRef, getDocRef } from "@/lib/firestore";
import SignaturePad from "@/components/ui/SignaturePad";
import { ChevronLeft } from "lucide-react";

export default function RegisterView({ onBack }: { onBack: () => void }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "driver",
    city: "",
    state: "",
    country: "US",
  });

  const [signature, setSignature] = useState("");
  const [pin, setPin] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const register = async () => {
    if (!form.name || !form.email || !signature) return;
    setLoading(true);

    const pinCode = Math.floor(1000 + Math.random() * 9000).toString();
    const col =
      form.role === "driver" ? "deliveryDrivers" : "pharmacyEmployees";

    const ref = await addDoc(getCollectionRef(col), {
      ...form,
      pin: pinCode,
      signature,
      createdAt: serverTimestamp(),
    });

    if (form.role === "pharmacy_admin") {
      await updateDoc(getDocRef(col, ref.id), { pharmacyId: ref.id });
    }

    setPin(pinCode);
    setLoading(false);
  };

  if (pin)
    return (
      <div className="h-screen bg-[#0f172a] flex flex-col items-center justify-center text-white text-center p-8">
        <h2 className="text-2xl font-black uppercase mb-4">SUCCESS</h2>
        <p className="text-xs uppercase mb-2">Your Access PIN</p>
        <p className="text-7xl font-black mb-8">{pin}</p>
        <button
          onClick={onBack}
          className="bg-white text-[#0f172a] py-5 rounded-3xl font-black uppercase text-xs w-full"
        >
          Go to Login
        </button>
      </div>
    );

  return (
    <div className="h-screen bg-[#0f172a] p-6 text-white flex flex-col">
      <button onClick={onBack} className="p-3 mb-4">
        <ChevronLeft />
      </button>

      <div className="flex-1 overflow-y-auto space-y-4">
        <input
          className="w-full p-4 rounded-xl bg-white text-slate-900 font-bold"
          placeholder="Full Name"
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="w-full p-4 rounded-xl bg-white text-slate-900 font-bold"
          placeholder="Email"
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <select
          className="w-full p-4 rounded-xl bg-white text-slate-900 font-bold"
          value={form.role}
          onChange={(e) =>
            setForm({ ...form, role: e.target.value as any })
          }
        >
          <option value="driver">Driver</option>
          <option value="pharmacy_admin">Admin</option>
          <option value="pharmacy_staff">Staff</option>
        </select>

        <SignaturePad label="Identity Signature" onSave={setSignature} />
      </div>

      <button
        onClick={register}
        disabled={loading || !signature}
        className="bg-emerald-600 py-5 rounded-3xl font-black uppercase text-xs mt-4"
      >
        {loading ? "Saving..." : "Create Account"}
      </button>
    </div>
  );
}
