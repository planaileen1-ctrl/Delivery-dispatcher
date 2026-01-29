"use client";

import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  const roles = [
    {
      title: "Administrator",
      description:
        "Full control over companies, pharmacies, clients, and system security.",
      color: "border-blue-600 bg-blue-50",
      titleColor: "text-blue-700",
      path: "/admin/login",
    },
    {
      title: "Pharmacy Staff",
      description:
        "Register medicines, manage inventory, and prepare safe deliveries.",
      color: "border-emerald-600 bg-emerald-50",
      titleColor: "text-emerald-700",
    },
    {
      title: "Delivery Driver",
      description:
        "Deliver medicines securely and update delivery status.",
      color: "border-amber-600 bg-amber-50",
      titleColor: "text-amber-700",
    },
    {
      title: "Client",
      description:
        "Receive pump deliveries and approve or confirm received orders.",
      color: "border-purple-600 bg-purple-50",
      titleColor: "text-purple-700",
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-10 text-gray-800">
        Select your role
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {roles.map((role) => (
          <div
            key={role.title}
            onClick={() => role.path && router.push(role.path)}
            className={`border-l-8 ${role.color} rounded-xl p-6 shadow-sm hover:shadow-lg transition cursor-pointer`}
          >
            <h2 className={`text-xl font-semibold mb-3 ${role.titleColor}`}>
              {role.title}
            </h2>
            <p className="text-gray-700 text-sm leading-relaxed">
              {role.description}
            </p>

            {role.path && (
              <span className="mt-4 inline-block text-sm font-medium text-blue-600">
                Click to login →
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
