"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

/* =======================
   TYPES
======================= */
type PumpCheck = {
  code: string;
  returned: boolean;
  reason?: string;
};

type ReturnDelivery = {
  id: string;
  pumpCodes: string[];
  status: string;
  clientId: string;
  pharmacyId: string;
  driverId?: string;
  clientName?: string;
  clientPhone?: string;
};

/* =======================
   PAGE
======================= */
export default function PharmacyReturnsPage() {
  const [returns, setReturns] = useState<ReturnDelivery[]>([]);
  const [checks, setChecks] = useState<Record<string, PumpCheck[]>>({});
  const router = useRouter();

  /* =======================
     AUTH + LOAD RETURNS
  ======================= */
  useEffect(() => {
    const stored = localStorage.getItem("pharmacy");
    if (!stored) {
      router.push("/pharmacy/login");
      return;
    }

    const pharmacy = JSON.parse(stored);

    const q = query(
      collection(db, "deliveries"),
      where("type", "==", "return"),
      where("pharmacyId", "==", pharmacy.id),
      where("status", "==", "returned_to_pharmacy")
    );

    const unsub = onSnapshot(q, async (snap) => {
      const list: ReturnDelivery[] = [];

      snap.forEach((d) => {
        const data = { id: d.id, ...(d.data() as any) };
        list.push(data);
      });

      // Inicializar checks por delivery
      const init: Record<string, PumpCheck[]> = {};
      list.forEach((r) => {
        init[r.id] = r.pumpCodes.map((code) => ({
          code,
          returned: true,
        }));
      });

      setReturns(list);
      setChecks(init);
    });

    return () => unsub();
  }, [router]);

  /* =======================
     CONFIRM REAL RECEPTION
  ======================= */
  const confirmReception = async (delivery: ReturnDelivery) => {
    const pumpChecks = checks[delivery.id];
    if (!pumpChecks) return;

    const batch = writeBatch(db);

    // 1️⃣ Update each pump
    for (const p of pumpChecks) {
      const pumpRef = doc(db, "pumps", p.code);

      if (p.returned) {
        batch.update(pumpRef, {
          status: "returned",
          currentClientId: null,
          currentDeliveryId: null,
          lastKnownLocation: "pharmacy",
          updatedAt: serverTimestamp(),
        });
      } else {
        if (!p.reason) {
          alert(
            `Reason required for missing pump ${p.code}`
          );
          return;
        }

        batch.update(pumpRef, {
          status: "lost",
          lastKnownLocation: "client",
          updatedAt: serverTimestamp(),
        });
      }
    }

    // 2️⃣ Mark delivery as confirmed
    batch.update(
      doc(db, "deliveries", delivery.id),
      {
        status: "received_by_pharmacy",
        receivedAt: serverTimestamp(),
      }
    );

    await batch.commit();
  };

  /* =======================
     UI
  ======================= */
  return (
    <div className="max-w-4xl mx-auto p-6">
      <button
        onClick={() => router.back()}
        className="text-blue-600 hover:underline mb-6"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold mb-6">
        Pump Returns – Pharmacy Control
      </h1>

      {returns.length === 0 && (
        <p>No returns pending confirmation.</p>
      )}

      <div className="space-y-6">
        {returns.map((r) => (
          <div
            key={r.id}
            className="border rounded p-4 space-y-3"
          >
            <p><b>Client:</b> {r.clientName || "—"}</p>
            <p><b>Phone:</b> {r.clientPhone || "—"}</p>

            <h3 className="font-semibold mt-4">
              Pump verification
            </h3>

            {checks[r.id]?.map((p, idx) => (
              <div
                key={p.code}
                className="border rounded p-3 mt-2"
              >
                <p className="font-medium">{p.code}</p>

                <label className="flex gap-3 mt-2">
                  <input
                    type="radio"
                    checked={p.returned}
                    onChange={() => {
                      const next = [...checks[r.id]];
                      next[idx].returned = true;
                      next[idx].reason = "";
                      setChecks({
                        ...checks,
                        [r.id]: next,
                      });
                    }}
                  />
                  Returned
                </label>

                <label className="flex gap-3 mt-1">
                  <input
                    type="radio"
                    checked={!p.returned}
                    onChange={() => {
                      const next = [...checks[r.id]];
                      next[idx].returned = false;
                      setChecks({
                        ...checks,
                        [r.id]: next,
                      });
                    }}
                  />
                  Not returned
                </label>

                {!p.returned && (
                  <textarea
                    placeholder="Reason why pump was not returned"
                    className="w-full border p-2 mt-2"
                    value={p.reason || ""}
                    onChange={(e) => {
                      const next = [...checks[r.id]];
                      next[idx].reason =
                        e.target.value;
                      setChecks({
                        ...checks,
                        [r.id]: next,
                      });
                    }}
                  />
                )}
              </div>
            ))}

            <button
              onClick={() => confirmReception(r)}
              className="w-full bg-green-600 text-white py-2 rounded mt-4"
            >
              Confirm Pump Reception
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
