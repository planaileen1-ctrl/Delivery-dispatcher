"use client";

import { useState } from "react";
import {
  ChevronLeft
} from "lucide-react";
import {
  collection,
  addDoc,
  updateDoc,
  query,
  where,
  getDocs,
  doc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase"; // ⚠️ ajusta si tu firebase está en otro lado
import SignaturePad from "../components/SignaturePad";

/* =======================
   DATA DE LOCALIDADES
======================= */
const LOCATIONS: Record<string, { label: string; states: string[] }> = {
  US: {
    label: "United States",
    states: [
      "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS",
      "KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY",
      "NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV",
      "WI","WY"
    ]
  },
  EC: {
    label: "Ecuador",
    states: [
      "Azuay","Bolívar","Cañar","Carchi","Chimborazo","Cotopaxi","El Oro","Esmeraldas",
      "Galápagos","Guayas","Imbabura","Loja","Los Ríos","Manabí","Morona Santiago",
      "Napo","Orellana","Pastaza","Pichincha","Santa Elena","Santo Domingo",
      "Sucumbíos","Tungurahua","Zamora Chinchipe"
    ]
  }
};

export default function RegisterView({ onBack }: any) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "driver" as "driver" | "pharmacy_admin",
    city: "",
    state: "",
    country: "US"
  });

  const [licenseCode, setLicenseCode] = useState("");
  const [newPin, setNewPin] = useState("");
  const [sign, setSign] = useState("");
  const [loading, setLoading] = useState(false);

  const register = async () => {
    if (!form.name || !form.email || !form.city || !form.state || !sign) return;

    setLoading(true);
    try {
      // VALIDAR LICENCIA SI ES FARMACIA
      if (form.role === "pharmacy_admin") {
        const q = query(
          collection(db, "pharmacyEmployees"),
          where("role", "==", "license_code"),
          where("code", "==", licenseCode),
          where("status", "==", "active")
        );

        const snap = await getDocs(q);
        if (snap.empty) {
          alert("Invalid License Code");
          setLoading(false);
          return;
        }

        await updateDoc(doc(db, "pharmacyEmployees", snap.docs[0].id), {
          status: "used",
          usedBy: form.email
        });
      }

      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      const colName =
        form.role === "driver" ? "deliveryDrivers" : "pharmacyEmployees";

      const docRef = await addDoc(collection(db, colName), {
        ...form,
        pin,
        city: form.city.trim(),
        state: form.state,
        country: form.country,
        signature: sign,
        createdAt: serverTimestamp()
      });

      if (form.role === "pharmacy_admin") {
        await updateDoc(docRef, { pharmacyId: docRef.id });
      }

      setNewPin(pin);
    } catch (e: any) {
      alert(e.message);
    }

    setLoading(false);
  };

  if (newPin) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-white text-center">
        <h2 className="text-3xl font-black italic mb-2">SUCCESS!</h2>
        <p className="text-6xl font-black text-indigo-400 tracking-tighter mb-8">
          {newPin}
        </p>
        <button
          onClick={onBack}
          className="w-full bg-white text-slate-950 py-5 rounded-[2rem] font-black uppercase text-xs"
        >
          Login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col p-8 text-white overflow-y-auto">
      <button
        onClick={onBack}
        className="self-start p-4 bg-white/5 rounded-2xl mb-6"
      >
        <ChevronLeft />
      </button>

      <h2 className="text-3xl font-black italic mb-2 tracking-tighter">
        REGISTER
      </h2>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setForm({ ...form, role: "driver" })}
            className={`py-4 rounded-2xl font-black text-[10px] uppercase border ${
              form.role === "driver"
                ? "bg-indigo-600 border-indigo-600"
                : "bg-transparent border-white/10"
            }`}
          >
            Independent Driver
          </button>

          <button
            onClick={() => setForm({ ...form, role: "pharmacy_admin" })}
            className={`py-4 rounded-2xl font-black text-[10px] uppercase border ${
              form.role === "pharmacy_admin"
                ? "bg-indigo-600 border-indigo-600"
                : "bg-transparent border-white/10"
            }`}
          >
            Pharmacy Owner
          </button>
        </div>

        {form.role === "pharmacy_admin" && (
          <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/30">
            <label className="text-[10px] font-black text-amber-500 ml-3 uppercase">
              License Code
            </label>
            <input
              className="w-full bg-transparent p-2 font-black text-lg text-amber-200 outline-none uppercase"
              placeholder="FARM-XXXX"
              value={licenseCode}
              onChange={(e) => setLicenseCode(e.target.value.toUpperCase())}
            />
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[10px] font-black text-indigo-500 ml-3">
            COUNTRY
          </label>
          <select
            className="w-full bg-white/5 p-4 rounded-2xl font-bold outline-none border border-white/10 text-sm"
            value={form.country}
            onChange={(e) =>
              setForm({ ...form, country: e.target.value, state: "" })
            }
          >
            {Object.entries(LOCATIONS).map(([key, val]) => (
              <option key={key} value={key} className="text-black">
                {val.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-indigo-500 ml-3">
              STATE / PROV
            </label>
            <select
              className="w-full bg-white/5 p-4 rounded-2xl font-bold outline-none border border-white/10 text-sm"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
            >
              <option value="">Select...</option>
              {LOCATIONS[form.country]?.states.map((s) => (
                <option key={s} value={s} className="text-black">
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-indigo-500 ml-3">
              CITY
            </label>
            <input
              className="w-full bg-white/5 p-4 rounded-2xl font-bold outline-none border border-white/10 text-sm"
              placeholder="City Name"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-indigo-500 ml-3">
            FULL NAME
          </label>
          <input
            className="w-full bg-white/5 p-4 rounded-2xl font-bold outline-none border border-white/10 text-sm"
            placeholder="Your Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-indigo-500 ml-3">
            EMAIL
          </label>
          <input
            className="w-full bg-white/5 p-4 rounded-2xl font-bold outline-none border border-white/10 text-sm"
            placeholder="you@email.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <SignaturePad onSave={setSign} label="Signature (Required)" />

        <button
          onClick={register}
          disabled={loading || !sign}
          className="w-full bg-emerald-500 py-5 rounded-[2rem] font-black uppercase text-xs mt-4 text-slate-900 disabled:opacity-50"
        >
          {loading ? "Verifying..." : "Complete Registration"}
        </button>
      </div>
    </div>
  );
}
