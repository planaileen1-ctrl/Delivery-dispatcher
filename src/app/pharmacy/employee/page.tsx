"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function EmployeeMenuPage() {
  const router = useRouter();
  const [pharmacy, setPharmacy] = useState<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem("pharmacy");

    if (!stored) {
      router.push("/pharmacy/login");
      return;
    }

    setPharmacy(JSON.parse(stored));
    setReady(true);
  }, [router]);

  if (!ready) return null;

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

        <button
          onClick={() => {
            localStorage.removeItem("pharmacy");
            router.push("/pharmacy/login");
          }}
          className="text-sm text-red-600 underline"
        >
          Logout pharmacy
        </button>
      </div>
    </div>
  );
}
