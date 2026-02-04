"use client";

import React from "react";

interface MenuCardProps {
  icon: React.ReactElement;
  label: string;
  color: string;
  onClick: () => void;
  full?: boolean;
}

export default function MenuCard({
  icon,
  label,
  color,
  onClick,
  full,
}: MenuCardProps) {
  return (
    <button
      onClick={onClick}
      className={`${color} ${
        full ? "col-span-2" : ""
      } p-6 rounded-[2.5rem] text-white flex flex-col items-center justify-center gap-3 shadow-xl active:scale-[0.98] transition-all`}
    >
      <div className="bg-white/20 p-4 rounded-[1.5rem]">
        {React.cloneElement(icon, { className: "w-6 h-6" })}
      </div>
      <span className="font-black text-[10px] uppercase tracking-widest text-center leading-tight">
        {label}
      </span>
    </button>
  );
}
