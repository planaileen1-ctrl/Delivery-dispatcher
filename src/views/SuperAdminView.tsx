"use client";

import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { LogOut, Ticket } from "lucide-react";

import { db } from "@/lib/firebase";
import { sendLicenseEmail } from "@/lib/sendEmail";

/* =========================
   SUPER ADMIN VIEW
========================= */

export default function SuperAdminView({
  onLogout,
}: {
  onLogout: () => void;
}) {
  const [email, setEmail] = useState("");
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  /* =========================
     ESCUCHAR LICENCIAS
  ========================= */
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "pharmacyEmployees"),
      (snap) => {
        const all = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        setLicenses(
          all.filter((l: any) => l.role === "license_code")
        );
      }
    );

    return () => unsub();
  }, []);

  /* =========================
     GENERAR LICENCIA + EMAIL
  ========================= */
  const generateLicense = async () => {
    if (!email) {
      alert("Enter an email");
      return;
    }

    setLoading(true);

    const code =
      "FARM-" +
      Math.random().toString(36).substring(2, 6).toUpperCase();

    try {
      /* 1️⃣ Guardar licencia */
      await addDoc(collection(db, "pharmacyEmployees"), {
        role: "license_code",
        code,
        status: "active",
        assignedEmail: email,
        createdAt: serverTimestamp(),
      });

      /* 2️⃣ Enviar email (NO rompe flujo) */
      await sendLicenseEmail(email, code);

      /* 3️⃣ UX FINAL (SIEMPRE ÉXITO) */
      alert(
        "License created successfully. Please check your email for a copy of your license."
      );

      setEmail("");
    } catch (err) {
      console.error("License error:", err);
      alert("License could not be created");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     UI
  ========================= */
  return (
    <div className="h-screen bg-[#0f172a] text-white flex flex-col">
      <header className="p-6 flex justify-between items-center border-b border-white/10">
        <h1 className="text-xl font-black uppercase tracking-widest">
          MASTER HUB
        </h1>
        <button
          onClick={onLogout}
          className="p-3 bg-white/5 rounded-xl"
        >
          <LogOut />
        </button>
      </header>

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        {/* GENERATE LICENSE */}
        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-4">
          <h2 className="flex items-center gap-2 font-black uppercase text-sm">
            <Ticket className="text-emerald-400" />
            Generate License
          </h2>

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Pharmacy email"
            className="w-full p-4 rounded-xl bg-slate-800 outline-none font-bold text-white"
          />

          <button
            onClick={generateLicense}
            disabled={loading}
            className="w-full bg-emerald-600 text-[#0f172a] py-4 rounded-2xl font-black uppercase text-xs disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate License"}
          </button>
        </div>

        {/* LICENSE LIST */}
        <div className="space-y-3">
          {licenses.map((l: any) => (
            <div
              key={l.id}
              className="bg-white/5 p-4 rounded-2xl border border-white/10 flex justify-between items-center"
            >
              <div>
                <p className="font-black text-emerald-400">
                  {l.code}
                </p>
                <p className="text-[10px] uppercase opacity-40">
                  {l.assignedEmail}
                </p>
              </div>

              <span
                className={`text-[9px] px-3 py-1 rounded-full font-black uppercase ${
                  l.status === "active"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {l.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
