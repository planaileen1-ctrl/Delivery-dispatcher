"use client";

import { ReactNode } from "react";

export default function MenuCard({
  icon,
  label,
  color,
  onClick,
  full,
  badge,
}: {
  icon: ReactNode;
  label: string;
  color: string;
  onClick: () => void;
  full?: boolean;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`${color} ${
        full ? "col-span-2" : ""
      } p-5 rounded-3xl text-white flex flex-col items-center justify-center gap-2 shadow-xl active:scale-[0.98] transition-all relative`}
    >
      {badge && badge > 0 && (
        <div className="absolute top-3 right-3 bg-red-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-bounce">
          {badge}
        </div>
      )}

      <div className="bg-white/20 p-3 rounded-2xl text-white">{icon}</div>
      <span className="font-black text-[9px] uppercase tracking-widest text-center leading-tight">
        {label}
      </span>
    </button>
  );
}
