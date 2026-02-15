"use client";

import { useEffect, useState } from "react";

export default function AdminModeBadge() {
  const [isPharmacyAdmin, setIsPharmacyAdmin] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const role = localStorage.getItem("EMPLOYEE_ROLE");
    setIsPharmacyAdmin(role === "PHARMACY_ADMIN");
  }, []);

  if (!isPharmacyAdmin) return null;

  return (
    <div className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[10px] font-black tracking-[0.16em] text-emerald-300">
      ADMIN MODE · PHARMACY
    </div>
  );
}