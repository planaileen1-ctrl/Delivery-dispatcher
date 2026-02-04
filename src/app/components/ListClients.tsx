"use client";

import { Trash2, Mail, MapPin } from "lucide-react";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";

export default function ListClients({ clients, readOnly }: any) {
  const remove = async (id: string) => {
    if (confirm("Delete client?")) {
      await deleteDoc(doc(db, "clients", id));
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {clients.map((c: any) => (
        <div
          key={c.id}
          className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative"
        >
          {!readOnly && (
            <button
              onClick={() => remove(c.id)}
              className="absolute top-4 right-4 p-2 text-slate-300"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <h4 className="font-black text-slate-800 text-lg">{c.name}</h4>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <Mail className="w-3 h-3" /> {c.email}
          </p>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {c.address}, {c.city}
          </p>
        </div>
      ))}
    </div>
  );
}
