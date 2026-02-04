"use client";

import { Trash2 } from "lucide-react";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";

export default function ListPumps({ pumps, readOnly }: any) {
  const remove = async (id: string) => {
    if (confirm("Delete?")) {
      await deleteDoc(doc(db, "pumps", id));
    }
  };

  return (
    <div className="space-y-3 pb-20">
      {pumps.map((p: any) => (
        <div
          key={p.id}
          className="bg-white p-5 rounded-[2rem] border border-slate-100 flex justify-between items-center shadow-sm"
        >
          <div>
            <p className="text-[10px] font-black text-indigo-500 uppercase">
              S/N: {p.code}
            </p>
            <p className="font-bold text-slate-800">{p.brand}</p>
            <span className="text-[8px] font-black uppercase bg-slate-100 px-2 py-1 rounded">
              {p.status}
            </span>
          </div>

          {!readOnly && (
            <button onClick={() => remove(p.id)} className="text-slate-300 p-2">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
