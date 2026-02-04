"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

interface Option {
  label: string;
  value: string;
  sub?: string;
}

interface SearchableSelectProps {
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchableSelect({
  label,
  options,
  value,
  onChange,
  placeholder,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!value) setSearch("");
  }, [value]);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-2 relative">
      <label className="text-[10px] font-black text-indigo-500 uppercase ml-2">
        {label}
      </label>

      <div className="relative">
        <input
          className="w-full p-4 rounded-2xl border-2 border-slate-200 font-bold bg-white outline-none focus:border-indigo-500 text-slate-700 uppercase text-xs"
          placeholder={
            value
              ? options.find((o) => o.value === value)?.label
              : placeholder
          }
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />

        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <Search className="w-5 h-5" />
        </div>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            <div className="absolute top-full left-0 w-full bg-white mt-2 rounded-2xl shadow-2xl border border-slate-100 max-h-60 overflow-y-auto z-20">
              {filtered.length === 0 ? (
                <div className="p-4 text-xs font-bold text-slate-400">
                  No results found
                </div>
              ) : (
                filtered.map((opt) => (
                  <div
                    key={opt.value}
                    className="p-4 border-b border-slate-50 hover:bg-indigo-50 cursor-pointer transition-colors"
                    onClick={() => {
                      onChange(opt.value);
                      setSearch("");
                      setIsOpen(false);
                    }}
                  >
                    <p className="font-bold text-sm text-slate-800">
                      {opt.label}
                    </p>
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
