"use client";

import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();

  const actions = [
    {
      title: "Create Pharmacy",
      description: "Register a new pharmacy and manage its basic information.",
      color: "border-blue-600 bg-blue-50",
      titleColor: "text-blue-700",
      path: "/admin/pharmacies/create",
    },
    {
      title: "Manage Pharmacies",
      description: "View, edit, and manage all registered pharmacies.",
      color: "border-indigo-600 bg-indigo-50",
      titleColor: "text-indigo-700",
      path: "/admin/pharmacies/menu",
    },
    {
      title: "Create Delivery Driver",
      description: "Add a new dispatcher or delivery driver to the system.",
      color: "border-emerald-600 bg-emerald-50",
      titleColor: "text-emerald-700",
      path: "/admin/drivers/create",
    },
    {
      title: "Manage Delivery Drivers", // ✅ NUEVA
      description: "View, edit, suspend and update delivery drivers.",
      color: "border-teal-600 bg-teal-50",
      titleColor: "text-teal-700",
      path: "/admin/drivers/manage",
    },
    {
      title: "Create Client",
      description: "Register new clients who will receive and approve deliveries.",
      color: "border-purple-600 bg-purple-50",
      titleColor: "text-purple-700",
      path: "/admin/clients/create",
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <button
        onClick={() => router.push("/dashboard")}
        className="mb-6 text-sm text-blue-600 hover:underline"
      >
        ← Back to Main Dashboard
      </button>

      <h1 className="text-3xl font-bold mb-10 text-gray-800">
        Administrator Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {actions.map((action) => (
          <div
            key={action.title}
            onClick={() => router.push(action.path)}
            className={`border-l-8 ${action.color} rounded-xl p-6 shadow-sm hover:shadow-lg transition cursor-pointer`}
          >
            <h2 className={`text-xl font-semibold mb-3 ${action.titleColor}`}>
              {action.title}
            </h2>

            <p className="text-gray-700 text-sm leading-relaxed">
              {action.description}
            </p>

            <span className="mt-4 inline-block text-sm font-medium text-blue-600">
              Go →
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
