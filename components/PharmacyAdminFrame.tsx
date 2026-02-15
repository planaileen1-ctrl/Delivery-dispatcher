"use client";

import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowLeft } from "lucide-react";

type PharmacyAdminFrameProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export default function PharmacyAdminFrame({
  title,
  subtitle,
  children,
}: PharmacyAdminFrameProps) {
  const router = useRouter();

  return (
    <div className="relative">
      <div className="fixed top-0 left-0 right-0 z-40 border-b border-emerald-500/20 bg-[#03131c]/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 grid place-items-center">
              <ShieldCheck size={16} className="text-emerald-300" />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-[0.18em] text-emerald-300">PHARMACY ADMIN PANEL</p>
              <p className="text-[11px] text-slate-300">{title} · {subtitle}</p>
            </div>
          </div>

          <button
            onClick={() => router.push("/pharmacy/dashboard")}
            className="inline-flex items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/20"
          >
            <ArrowLeft size={12} />
            Dashboard
          </button>
        </div>
      </div>

      <div className="pt-16">
        {children}
      </div>
    </div>
  );
}
