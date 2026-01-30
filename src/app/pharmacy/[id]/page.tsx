"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  UserPlus,
  Users,
  Truck,
  PackageSearch,
} from "lucide-react";

export default function PharmacyDashboard() {
  const router = useRouter();
  const [pharmacy, setPharmacy] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPharmacy = async () => {
      const stored = localStorage.getItem("pharmacy");

      if (!stored) {
        router.push("/pharmacy/login");
        return;
      }

      const localPharmacy = JSON.parse(stored);
      const ref = doc(db, "pharmacies", localPharmacy.id);
      const snap = await getDoc(ref);

      if (!snap.exists() || snap.data()?.suspended) {
        localStorage.removeItem("pharmacy");
        router.push("/pharmacy/login");
        return;
      }

      setPharmacy({ id: snap.id, ...snap.data() });
      setLoading(false);
    };

    loadPharmacy();
  }, [router]);

  if (loading) {
    return <p className="mt-16 text-center text-gray-500">Loading dashboard…</p>;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">

      {/* TOP NAV */}
      <div className="flex items-center gap-4 text-sm mb-10">
        <button
          onClick={() => {
            localStorage.removeItem("pharmacy");
            router.push("/pharmacy/login");
          }}
          className="text-blue-600 hover:underline"
        >
          ← Back to menu
        </button>
        <span className="text-gray-300">|</span>
        <button
          onClick={() => router.push("/dashboard")}
          className="text-blue-600 hover:underline"
        >
          Back to dashboard
        </button>
      </div>

      {/* TITLE */}
      <h1 className="text-3xl font-bold mb-2">
        Welcome, {pharmacy.name}
      </h1>
      <p className="text-gray-500 mb-10">
        Manage clients and deliveries from your pharmacy dashboard.
      </p>

      {/* CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">

        {/* CARD */}
        <DashboardCard
          title="Create Client"
          description="Register a new client quickly and easily."
          icon={<UserPlus size={28} />}
          gradient="from-blue-500 to-indigo-500"
          onClick={() =>
            router.push(`/pharmacy/${pharmacy.id}/create-client`)
          }
        />

        <DashboardCard
          title="Manage Clients"
          description="View, edit or remove existing clients."
          icon={<Users size={28} />}
          gradient="from-indigo-500 to-violet-500"
          onClick={() =>
            router.push(`/pharmacy/${pharmacy.id}/clients`)
          }
        />

        <DashboardCard
          title="Create Delivery"
          description="Create a new delivery order."
          icon={<Truck size={28} />}
          gradient="from-purple-500 to-fuchsia-500"
          onClick={() =>
            router.push(`/pharmacy/${pharmacy.id}/create-delivery`)
          }
        />

        <DashboardCard
          title="View Deliveries"
          description="Track and manage all deliveries."
          icon={<PackageSearch size={28} />}
          gradient="from-gray-700 to-gray-900"
          onClick={() =>
            router.push(`/pharmacy/${pharmacy.id}/deliveries`)
          }
        />

      </div>
    </div>
  );
}

/* 🧩 CARD COMPONENT */
function DashboardCard({
  title,
  description,
  icon,
  gradient,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-2xl border border-gray-200 bg-white p-6
      transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <div
        className={`mb-4 inline-flex items-center justify-center rounded-xl
        bg-gradient-to-br ${gradient} p-3 text-white`}
      >
        {icon}
      </div>

      <h2 className="text-xl font-semibold mb-1">
        {title}
      </h2>

      <p className="text-gray-500 text-sm">
        {description}
      </p>
    </div>
  );
}
