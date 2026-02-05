"use client";

import { deleteDoc } from "firebase/firestore";
import { getDocRef } from "@/lib/firestore";
import { Pump } from "@/types";
import { Trash2 } from "lucide-react";

export default function ListAssets({
  pumps,
  readOnly,
}: {
  pumps: Pump[];
  readOnly?: boolean;
}) {
  const remove = async (id: string) => {
    if (confirm("Permanently delete?")) {
      await deleteDoc(getDocRef("pumps", id));
    }
  };

  if (pumps.length === 0)
    return (
      <p className="text-center py-20 opacity-30 font-black text-xs">
        No Assets Registered
      </p>
    );

  return (
    <div className="space-y-3 pb-20">
      {pumps.map((p) => (
        <div
          key={p.id}
          className="bg-white p-4 rounded-2xl border flex justify-between items-center shadow-sm"
        >
          <div>
            <p className="text-[10px] font-black text-indigo-600 uppercase">
              S/N: {p.code}
            </p>
            <p className="font-bold text-sm">
              {p.brand || "No Brand"}
            </p>
          </div>

          {!readOnly && (
            <button
              onClick={() => remove(p.id)}
              className="text-slate-300 p-2 hover:text-red-500"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
