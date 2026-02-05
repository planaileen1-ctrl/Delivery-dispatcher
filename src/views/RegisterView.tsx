"use client";

import { useState } from "react";
import { addDoc, updateDoc, getDocs, serverTimestamp } from "firebase/firestore";
import { ChevronLeft } from "lucide-react";

import { getCollectionRef, getDocRef } from "@/lib/firestore";
import SignaturePad from "@/components/ui/SignaturePad";

/* =========================
   LOCATIONS (EXACT COPY)
========================= */
const LOCATIONS: Record<string, { label: string; states: string[] }> = {
  US: {
    label: "United States",
    states: [
      "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA",
      "ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH",
      "OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"
    ],
  },
  EC: {
    label: "Ecuador",
    states: [
      "Azuay","Bolívar","Cañar","Carchi","Chimborazo","Cotopaxi","El Oro","Esmeraldas",
      "Galápagos","Guayas","Imbabura","Loja","Los Ríos","Manabí","Morona Santiago",
      "Napo","Orellana","Pastaza","Pichincha","Santa Elena","Santo Domingo",
      "Sucumbíos","Tungurahua","Zamora Chinchipe"
    ],
  },
};

export default function RegisterView({ onBack }: { onBack: () => void }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "driver" as "driver" | "pharmacy_admin" | "pharmacy_staff",
    city: "",
    state: "",
    country: "US",
    adminPin: "",
  });

  const [license, setLicense] = useState("");
  const [signature, setSignature] = useState("");
  const [newPin, setNewPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [authorizedAdmin, setAuthorizedAdmin] = useState<any>(null);

  /* =========================
     STAFF AUTH BY ADMIN PIN
  ========================= */
  const validateAdminPin = async (pin: string) => {
    if (pin.length !== 4) return setAuthorizedAdmin(null);

    const snap = await getDocs(getCollectionRef("pharmacyEmployees"));
    const found = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .find((e: any) => e.pin === pin && e.role === "pharmacy_admin");

    setAuthorizedAdmin(found || null);
  };

  /* =========================
     REGISTER
  ========================= */
  const register = async () => {
    if (!form.name || !form.email || !form.city || !form.state) return;
    if (form.role !== "pharmacy_admin" && !signature) return;

    setLoading(true);

    try {
      let pharmacyId = "";

      // ADMIN → validate license
      if (form.role === "pharmacy_admin") {
        const snap = await getDocs(getCollectionRef("pharmacyEmployees"));
        const lic = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .find((l: any) => l.role === "license_code" && l.code === license && l.status === "active");

        if (!lic) {
          alert("Invalid license code");
          setLoading(false);
          return;
        }

        await updateDoc(getDocRef("pharmacyEmployees", lic.id), {
          status: "used",
          usedBy: form.email,
        });
      }

      // STAFF → needs admin
      if (form.role === "pharmacy_staff") {
        if (!authorizedAdmin) {
          alert("Admin PIN validation failed");
          setLoading(false);
          return;
        }
        pharmacyId = authorizedAdmin.id;
      }

      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      const col = form.role === "driver" ? "deliveryDrivers" : "pharmacyEmployees";

      const ref = await addDoc(getCollectionRef(col), {
        ...form,
        pin,
        pharmacyId,
        signature: signature || "",
        createdAt: serverTimestamp(),
      });

      if (form.role === "pharmacy_admin") {
        await updateDoc(ref, { pharmacyId: ref.id });
      }

      setNewPin(pin);
    } catch (e: any) {
      alert(e.message);
    }

    setLoading(false);
  };

  /* =========================
     SUCCESS SCREEN
  ========================= */
  if (newPin) {
    return (
      <div className="h-screen bg-[#0f172a] flex flex-col items-center justify-center p-8 text-white text-center">
        <h2 className="text-2xl font-black italic uppercase mb-4 text-emerald-400">
          SUCCESS!
        </h2>
        <p className="text-xs uppercase mb-2 opacity-60">Your Private Access PIN</p>
        <p className="text-7xl font-black mb-8">{newPin}</p>

        <button
          onClick={onBack}
          className="w-full bg-white text-[#0f172a] py-5 rounded-3xl font-black uppercase text-xs"
        >
          Go to Login
        </button>
      </div>
    );
  }

  /* =========================
     FORM
  ========================= */
  return (
    <div className="h-screen bg-[#0f172a] flex flex-col p-6 text-white">
      <button onClick={onBack} className="self-start p-3 bg-white/5 rounded-2xl mb-4">
        <ChevronLeft />
      </button>

      <div className="flex-1 overflow-y-auto space-y-6">
        <h2 className="text-2xl font-black italic uppercase text-center">
          Setup Account
        </h2>

        {/* ROLE SELECT */}
        <div className="flex gap-2">
          {["driver", "pharmacy_admin", "pharmacy_staff"].map(r => (
            <button
              key={r}
              onClick={() => setForm({ ...form, role: r as any })}
              className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase border ${
                form.role === r
                  ? "bg-indigo-600 border-indigo-600"
                  : "border-white/10 text-slate-400"
              }`}
            >
              {r === "driver" ? "Driver" : r === "pharmacy_admin" ? "Admin" : "Staff"}
            </button>
          ))}
        </div>

        {/* LICENSE / ADMIN PIN */}
        {form.role === "pharmacy_admin" && (
          <input
            className="w-full bg-white/5 p-4 rounded-xl text-center font-black uppercase text-emerald-300"
            placeholder="License Code"
            value={license}
            onChange={e => setLicense(e.target.value.toUpperCase())}
          />
        )}

        {form.role === "pharmacy_staff" && (
          <input
            className="w-full bg-white/5 p-4 rounded-xl text-center font-black text-white"
            placeholder="Admin PIN"
            maxLength={4}
            value={form.adminPin}
            onChange={e => {
              setForm({ ...form, adminPin: e.target.value });
              validateAdminPin(e.target.value);
            }}
          />
        )}

        {/* LOCATION */}
        <select
          className="w-full bg-white p-3 rounded-xl text-slate-900 font-bold"
          value={form.country}
          onChange={e => setForm({ ...form, country: e.target.value, state: "" })}
        >
          {Object.entries(LOCATIONS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <select
          className="w-full bg-white p-3 rounded-xl text-slate-900 font-bold"
          value={form.state}
          onChange={e => setForm({ ...form, state: e.target.value })}
        >
          <option value="">Select State</option>
          {LOCATIONS[form.country].states.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <input
          className="w-full bg-white/5 p-4 rounded-xl font-bold"
          placeholder="City"
          value={form.city}
          onChange={e => setForm({ ...form, city: e.target.value })}
        />

        <input
          className="w-full bg-white/5 p-4 rounded-xl font-bold"
          placeholder="Full Name"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
        />

        <input
          className="w-full bg-white/5 p-4 rounded-xl font-bold"
          placeholder="Email"
          value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
        />

        {form.role !== "pharmacy_admin" && (
          <SignaturePad
            label="Identity Signature (Required)"
            onSave={setSignature}
          />
        )}
      </div>

      <button
        onClick={register}
        disabled={loading || (form.role !== "pharmacy_admin" && !signature)}
        className="bg-emerald-600 py-5 rounded-3xl font-black uppercase text-xs mt-4 disabled:opacity-50"
      >
        {loading ? "Saving..." : "Create Account"}
      </button>
    </div>
  );
}
