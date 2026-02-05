"use client";

import { useEffect, useState } from "react";
import { addDoc, serverTimestamp } from "firebase/firestore";
import { getCollectionRef } from "@/lib/firestore";
import { Pump, Client } from "@/types";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { XCircle } from "lucide-react";

export default function CreateDispatchForm({
  clients,
  pumps,
  user,
  pharmacyId,
  onFinish,
}: {
  clients: Client[];
  pumps: Pump[];
  user: any;
  pharmacyId: string;
  onFinish: () => void;
}) {
  const [clientId, setClientId] = useState("");
  const [selected, setSelected] = useState<Pump[]>([]);
  const [debts, setDebts] = useState<Pump[]>([]);

  useEffect(() => {
    if (!clientId) {
      setDebts([]);
      return;
    }
    setDebts(
      pumps.filter(
        (p) => p.currentClientId === clientId && p.status === "with_client"
      )
    );
  }, [clientId, pumps]);

  const addPump = (id: string) => {
    const p = pumps.find((x) => x.id === id);
    if (p) setSelected([...selected, p]);
  };

  const create = async () => {
    if (!clientId || selected.length === 0) return;
    const c = clients.find((x) => x.id === clientId);
    if (!c) return;

    await addDoc(getCollectionRef("deliveries"), {
      orderCode: Math.floor(1000 + Math.random() * 9000).toString(),
      clientName: c.name,
      clientEmail: c.email,
      clientId: c.id,
      address: c.address,
      city: user.city || "Unknown",
      state: user.state || "Unknown",
      country: user.country || "US",
      status: "ready",
      pumps: selected.map((p) => ({ pumpId: p.id, code: p.code })),
      createdAt: serverTimestamp(),
      pharmacyId,
    });

    onFinish();
  };

  return (
    <div className="space-y-4 text-left">
      <SearchableSelect
        label="1. Select Client"
        options={clients.map((c) => ({ label: c.name, value: c.id }))}
        value={clientId}
        onChange={setClientId}
      />

      {debts.length > 0 && (
        <div className="bg-red-50 p-3 rounded-xl border border-red-100 text-red-600">
          <p className="text-[9px] font-black uppercase mb-1">
            Unreturned Assets:
          </p>
          <div className="flex flex-wrap gap-1">
            {debts.map((p) => (
              <span
                key={p.id}
                className="text-[9px] bg-white px-1.5 py-0.5 rounded font-mono font-bold border"
              >
                {p.code}
              </span>
            ))}
          </div>
        </div>
      )}

      <SearchableSelect
        label="2. Assign Items"
        options={pumps
          .filter(
            (p) =>
              p.status === "available" &&
              !selected.find((x) => x.id === p.id)
          )
          .map((p) => ({ label: p.code, value: p.id }))}
        onChange={addPump}
      />

      {selected.length > 0 && (
        <div className="space-y-2">
          {selected.map((p) => (
            <div
              key={p.id}
              className="flex justify-between items-center p-3 bg-indigo-50 rounded-xl border"
            >
              <p className="font-black text-xs uppercase">S/N: {p.code}</p>
              <button
                onClick={() =>
                  setSelected(selected.filter((x) => x.id !== p.id))
                }
                className="text-red-500"
              >
                <XCircle size={20} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={create}
        disabled={!clientId || selected.length === 0}
        className="w-full bg-[#0f172a] text-white py-4 rounded-2xl font-black uppercase text-xs mt-4 disabled:opacity-50"
      >
        Start Dispatch
      </button>
    </div>
  );
}
