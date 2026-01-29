"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function PharmacyAdminPage() {
  const { id } = useParams();
  const router = useRouter();

  const [pharmacy, setPharmacy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadPharmacy = async () => {
      const ref = doc(db, "pharmacies", id as string);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        alert("Pharmacy not found");
        router.push("/admin/pharmacies/menu");
        return;
      }

      // 🔥 Cargamos TODO el documento
      setPharmacy({ id: snap.id, ...snap.data() });
      setLoading(false);
    };

    loadPharmacy();
  }, [id, router]);

  const saveChanges = async () => {
    setSaving(true);
    const ref = doc(db, "pharmacies", id as string);

    // 🔥 Guardamos TODOS los campos editables
    await updateDoc(ref, {
      name: pharmacy.name,
      email: pharmacy.email,
      whatsapp: pharmacy.whatsapp,
      representative: pharmacy.representative,
      pin: pharmacy.pin,
      suspended: pharmacy.suspended ?? false,
    });

    setSaving(false);
    alert("Changes saved");
  };

  if (loading) return <p className="mt-10 text-center">Loading...</p>;
  if (!pharmacy) return null;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <button
        onClick={() => router.back()}
        className="text-sm text-blue-600 hover:underline mb-6"
      >
        ← Back
      </button>

      {/* 🚨 SUSPENDED WARNING */}
      {pharmacy.suspended === true && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
          ⚠️ This pharmacy is currently <strong>suspended</strong>.
          It is hidden from the system until reactivated.
        </div>
      )}

      <h1 className="text-3xl font-bold mb-8">
        Pharmacy Details
      </h1>

      {/* NAME */}
      <div className="mb-4">
        <label className="block text-sm font-medium">
          Pharmacy Name
        </label>
        <input
          value={pharmacy.name ?? ""}
          onChange={(e) =>
            setPharmacy({ ...pharmacy, name: e.target.value })
          }
          className="w-full border rounded px-3 py-2"
        />
      </div>

      {/* EMAIL */}
      <div className="mb-4">
        <label className="block text-sm font-medium">
          Email
        </label>
        <input
          type="email"
          value={pharmacy.email ?? ""}
          onChange={(e) =>
            setPharmacy({ ...pharmacy, email: e.target.value })
          }
          className="w-full border rounded px-3 py-2"
        />
      </div>

      {/* WHATSAPP */}
      <div className="mb-4">
        <label className="block text-sm font-medium">
          WhatsApp Number
        </label>
        <input
          value={pharmacy.whatsapp ?? ""}
          onChange={(e) =>
            setPharmacy({ ...pharmacy, whatsapp: e.target.value })
          }
          className="w-full border rounded px-3 py-2"
          placeholder="+1 555 123 4567"
        />
      </div>

      {/* REPRESENTATIVE */}
      <div className="mb-4">
        <label className="block text-sm font-medium">
          Representative
        </label>
        <input
          value={pharmacy.representative ?? ""}
          onChange={(e) =>
            setPharmacy({ ...pharmacy, representative: e.target.value })
          }
          className="w-full border rounded px-3 py-2"
        />
      </div>

      {/* PIN */}
      <div className="mb-4">
        <label className="block text-sm font-medium">
          PIN
        </label>
        <input
          value={pharmacy.pin ?? ""}
          onChange={(e) =>
            setPharmacy({ ...pharmacy, pin: e.target.value })
          }
          className="w-full border rounded px-3 py-2"
        />
      </div>

      {/* SUSPEND */}
      <div className="flex items-center gap-2 mb-8">
        <input
          type="checkbox"
          checked={pharmacy.suspended ?? false}
          onChange={(e) =>
            setPharmacy({ ...pharmacy, suspended: e.target.checked })
          }
        />
        <span className="text-sm">
          Suspend pharmacy (hide from system)
        </span>
      </div>

      {/* SAVE */}
      <button
        onClick={saveChanges}
        disabled={saving}
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
