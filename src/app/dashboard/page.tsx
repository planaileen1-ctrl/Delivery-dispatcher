"use client";

import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  const roles = [
    {
      title: "Administrator",
      description:
        "Full control over companies, pharmacies, clients, and system security.",
      color: "md:border-blue-600 bg-blue-50",
      titleColor: "text-blue-700",
      path: "/admin/login",
    },
    {
      title: "Pharmacy Staff",
      description:
        "Register medicines, manage inventory, and prepare safe deliveries.",
      color: "md:border-emerald-600 bg-emerald-50",
      titleColor: "text-emerald-700",
      path: "/pharmacy/login",
    },
    {
      title: "Delivery Driver",
      description:
        "Deliver medicines securely and update delivery status.",
      color: "md:border-amber-600 bg-amber-50",
      titleColor: "text-amber-700",
      path: "/delivery-driver/login",
    },
    {
      title: "Client",
      description:
        "Receive pump deliveries and approve or confirm received orders.",
      color: "md:border-purple-600 bg-purple-50",
      titleColor: "text-purple-700",
      path: "/client/login",
    },
  ];

  return (
    <div className="px-4 sm:px-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-8 text-gray-800">
        Select your role
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {roles.map((role) => (
          <div
            key={role.title}
            onClick={() => role.path && router.push(role.path)}
            className={`
              group cursor-pointer rounded-2xl p-6
              border border-gray-200
              md:border-l-8 ${role.color}
              bg-white
              shadow-sm hover:shadow-xl
              transition-all duration-300
              active:scale-[0.98]
            `}
          >
            {/* TOP COLOR INDICATOR (MOBILE FRIENDLY) */}
            <div
              className={`h-1 w-12 mb-4 rounded-full ${role.titleColor.replace(
                "text",
                "bg"
              )}`}
            />

            <h2
              className={`text-lg sm:text-xl font-semibold mb-2 ${role.titleColor}`}
            >
              {role.title}
            </h2>

            <p className="text-gray-700 text-sm leading-relaxed">
              {role.description}
            </p>

            {role.path && (
              <span className="mt-4 inline-block text-sm font-medium text-gray-600 group-hover:text-gray-900">
                Tap to continue →
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
