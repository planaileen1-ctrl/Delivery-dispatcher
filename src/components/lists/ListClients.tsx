"use client";

import { deleteDoc } from "firebase/firestore";
import { getDocRef } from "@/lib/firestore";
import { Client } from "@/types";
import { Trash2 } from "lucide-react";

export default function ListClients({
  clients,
  readOnly,
}: {
  clients: Client[];
  readOnly?: boolean;
}) {
  const del = async (id: string) => {
    if (confirm("Delete Client?")) {
      await deleteDoc(getDocRef("clients", id));
    }
  };

  if (clients.length === 0)
    return (
      <p className="text-center py-20 opacity-30 font-black text-xs uppercase">
        No Clients
      </p>
    );

  return (
    <div className="space-y-3 pb-20">
      {clients.map((c) => (
        <div
          key={c.id}
          className="bg-white p-4 rounded-2xl border flex justify-between items-center shadow-sm"
        >
          <div>
            <p className="font-black">{c.name}</p>
            <p className="text-[10px] text-slate-400 uppercase">{c.city}</p>
          </div>

          {!readOnly && (
            <button
              onClick={() => del(c.id)}
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
