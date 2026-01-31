"use client";

import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Building2,
  Truck,
  User,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();

  const roles = [
    {
      title: "Administrator",
      description:
        "Control pharmacies, users and system configuration.",
      icon: <ShieldCheck size={26} />,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      path: "/admin/login",
    },
    {
      title: "Pharmacy",
      description:
        "Manage pumps, clients and medical deliveries.",
      icon: <Building2 size={26} />,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      path: "/pharmacy/login",
    },
    {
      title: "Delivery Driver",
      description:
        "Deliver pumps and update delivery status.",
      icon: <Truck size={26} />,
      color: "text-orange-600",
      bg: "bg-orange-50",
      path: "/delivery-driver/login",
    },
    {
      title: "Client",
      description:
        "Receive pumps and manage returns.",
      icon: <User size={26} />,
      color: "text-purple-600",
      bg: "bg-purple-50",
      path: "/client/login",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f5f5f7] via-[#fafafa] to-white px-6 py-16">
      {/* HEADER */}
      <div className="max-w-6xl mx-auto mb-14 text-center md:text-left">
        <h1 className="text-4xl font-semibold tracking-tight text-gray-900">
          Reusable Medical Asset Control System
        </h1>
        <p className="mt-3 text-gray-600 max-w-xl">
          Secure pump logistics, real-time traceability and safe medical deliveries.
        </p>
      </div>

      {/* CARDS */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {roles.map((role) => (
          <div
            key={role.title}
            onClick={() => router.push(role.path)}
            className="group cursor-pointer rounded-3xl bg-white
            shadow-[0_10px_30px_rgba(0,0,0,0.06)]
            hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)]
            transition-all duration-300 overflow-hidden"
          >
            {/* TOP BAR */}
            <div className={`h-1 ${role.bg}`} />

            <div className="p-6 flex flex-col h-full">
              {/* ICON */}
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${role.bg} ${role.color}`}
              >
                {role.icon}
              </div>

              {/* TEXT */}
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                {role.title}
              </h2>

              <p className="text-sm text-gray-600 flex-1">
                {role.description}
              </p>

              {/* CTA */}
              <span
                className={`mt-6 inline-flex items-center gap-2 text-sm font-medium ${role.color}`}
              >
                Enter
                <span className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
