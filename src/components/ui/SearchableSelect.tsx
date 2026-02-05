"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

type Option = {
  label: string;
  value: string;
  sub?: string;
};

export default function SearchableSelect({
  label,
  options,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  options: Option[];
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [term, setTerm] = useState("");

  useEffect(() => {
    if (!value) setTerm("");
  }, [value]);

  const filtered = options.filter((o) =>
    (o.label || "").toLowerCase().includes(term.toLowerCase())
  );

  return (
    <div className="space-y-1 relative text-slate-900 text-left">
      <label className="text-[10px] font-black text-indigo-500 uppercase ml-2">
        {label}
      </label>

      <div className="relative">
        <input
          className="w-full p-3 rounded-xl border border-slate-200 font-bold bg-white outline-none focus:border-indigo-500 text-slate-900 uppercase text-xs shadow-sm"
          placeholder={
            value
              ? options.find((o) => o.value === value)?.label
              : placeholder
          }
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <Search size={16} />
        </div>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-full left-0 w-full bg-white mt-1 rounded-xl shadow-2xl border border-slate-100 max-h-48 overflow-y-auto z-20">
              {filtered.length === 0 ? (
                <div className="p-3 text-xs font-bold text-slate-400 text-center">
                  No results found
                </div>
              ) : (
                filtered.map((opt) => (
                  <div
                    key={opt.value}
                    className="p-3 border-b border-slate-50 hover:bg-indigo-50 cursor-pointer transition-colors text-left font-bold text-slate-800"
                    onClick={() => {
                      onChange(opt.value);
                      setTerm("");
                      setIsOpen(false);
                    }}
                  >
                    <p className="text-sm font-black uppercase">{opt.label}</p>
                    {opt.sub && (
                      <p className="text-[9px] text-slate-400 font-black uppercase">
                        {opt.sub}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
