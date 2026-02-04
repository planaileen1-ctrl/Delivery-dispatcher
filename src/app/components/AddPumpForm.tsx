"use client";

import { useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc
} from "firebase/firestore";
import { db } from "../firebase";

export default function AddPumpForm({ onFinish, pharmacyId }: any) {
  const [form, setForm] = useState({
    code: "",
    brand: "",
    model: ""
  });
  const [savedMsg, setSavedMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const save = async () => {
    if (!form.code) return;

    setErrorMsg("");
    setSavedMsg("");

    const q = query(
      collection(db, "pumps"),
      where("code", "==", form.code),
      where("pharmacyId", "==", pharmacyId)
    );

    const snap = await getDocs(q);
    if (!snap.empty) {
      setErrorMsg(`Error: Pump ${form.code} already exists!`);
      return;
    }

    const dateStr = new Date().toLocaleString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true
    });

    await addDoc(collection(db, "pumps"), {
      ...form,
      status: "available",
      lastReview: dateStr,
      pharmacyId
    });

    setSavedMsg(`Saved: ${form.code}`);
    setForm({ code: "", brand: "", model: "" });
    setTimeout(() => setSavedMsg(""), 3000);
  };

  return (
    <div className="space-y-6 p-4">
      <h3 className="font-black text-xl italic">NEW EQUIPMENT</h3>

      {savedMsg && (
        <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-center font-bold text-xs">
          {savedMsg}
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-center font-bold text-xs">
          {errorMsg}
        </div>
      )}

      <input
        className="w-full bg-slate-50 p-4 rounded-2xl font-bold"
        placeholder="Serial Number"
        value={form.code}
        onChange={(e) => setForm({ ...form, code: e.target.value })}
      />

      <input
        className="w-full bg-slate-50 p-4 rounded-2xl font-bold"
        placeholder="Brand"
        value={form.brand}
        onChange={(e) => setForm({ ...form, brand: e.target.value })}
      />

      <input
        className="w-full bg-slate-50 p-4 rounded-2xl font-bold"
        placeholder="Model"
        value={form.model}
        onChange={(e) => setForm({ ...form, model: e.target.value })}
      />

      <button
        onClick={save}
        className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black uppercase text-xs"
      >
        Save & Add Another
      </button>
    </div>
  );
}
