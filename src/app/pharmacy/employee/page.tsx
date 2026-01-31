"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EmployeeMenuPage() {
  const router = useRouter();

  useEffect(() => {
    const pharmacy = localStorage.getItem("pharmacy");
    if (!pharmacy) router.push("/pharmacy/login");
  }, [router]);

  const pharmacy = JSON.parse(
    localStorage.getItem("pharmacy") || "{}"
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-10 rounded-xl shadow w-full max-w-md text-center space-y-6">
        <h1 className="text-2xl font-bold">
          {pharmacy.name}
        </h1>

        <button
          onClick={() =>
            router.push("/pharmacy/employee/login")
          }
          className="w-full bg-blue-600 text-white py-3 rounded"
        >
          Employee Login
        </button>

        <button
          onClick={() =>
            router.push("/pharmacy/employee/register")
          }
          className="w-full bg-green-600 text-white py-3 rounded"
        >
          Register Employee
        </button>
      </div>
    </div>
  );
}
