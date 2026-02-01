"use client";

import { useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function PharmacyLoginPage() {
  const router = useRouter();

  const [pharmacyPin, setPharmacyPin] = useState("");
  const [employeePin, setEmployeePin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");

    if (pharmacyPin.length !== 4 || employeePin.length !== 4) {
      setError("Both PINs must be 4 digits");
      return;
    }

    try {
      setLoading(true);

      // 🏥 VALIDAR FARMACIA
      const pharmacyQuery = query(
        collection(db, "pharmacies"),
        where("pin", "==", pharmacyPin)
      );

      const pharmacySnap = await getDocs(pharmacyQuery);

      if (pharmacySnap.empty) {
        setError("Invalid pharmacy PIN");
        return;
      }

      const pharmacyDoc = pharmacySnap.docs[0];
      const pharmacyData = pharmacyDoc.data();

      if (pharmacyData.suspended) {
        setError("This pharmacy account is suspended");
        return;
      }

      // 👤 VALIDAR EMPLEADO
      const employeeQuery = query(
        collection(db, "pharmacyEmployees"),
        where("pharmacyId", "==", pharmacyDoc.id),
        where("pin", "==", employeePin),
        where("active", "==", true)
      );

      const employeeSnap = await getDocs(employeeQuery);

      if (employeeSnap.empty) {
        setError("Invalid employee PIN");
        return;
      }

      const employeeDoc = employeeSnap.docs[0];
      const employeeData = employeeDoc.data();

      // 💾 SESIÓN
      localStorage.setItem(
        "pharmacy",
        JSON.stringify({
          id: pharmacyDoc.id,
          name: pharmacyData.name,
          email: pharmacyData.email,
        })
      );

      localStorage.setItem(
        "employee",
        JSON.stringify({
          id: employeeDoc.id,
          name: employeeData.name,
          email: employeeData.email,
          employeeCode: employeeData.employeeCode,
        })
      );

      router.push(`/pharmacy/${pharmacyDoc.id}`);
    } catch (e) {
      console.error(e);
      setError("Login error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold text-center">
          Pharmacy & Employee Access
        </h1>

        {/* 🏥 PIN FARMACIA */}
        <input
          value={pharmacyPin}
          onChange={(e) =>
            setPharmacyPin(e.target.value.replace(/\D/g, ""))
          }
          maxLength={4}
          className="w-full text-center text-2xl tracking-widest border p-3"
          placeholder="Pharmacy PIN"
        />

        {/* 👤 PIN EMPLEADO */}
        <input
          value={employeePin}
          onChange={(e) =>
            setEmployeePin(e.target.value.replace(/\D/g, ""))
          }
          maxLength={4}
          className="w-full text-center text-2xl tracking-widest border p-3"
          placeholder="Employee PIN"
        />

        {error && (
          <p className="text-red-600 text-sm text-center">
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-green-600 text-white py-3 rounded hover:bg-green-700 disabled:opacity-60"
        >
          {loading ? "Checking..." : "Enter"}
        </button>

        {/* ➕ REGISTRAR EMPLEADO */}
        <p className="text-center text-sm text-gray-500 pt-2">
          New employee?{" "}
          <button
            onClick={() =>
              router.push("/pharmacy/employee/register")
            }
            className="text-blue-600 hover:underline"
          >
            Register employee
          </button>
        </p>

        {/* 🏥 REGISTRAR FARMACIA */}
        <p className="text-center text-sm text-gray-500">
          New pharmacy?{" "}
          <button
            onClick={() =>
              router.push("/pharmacy/register")
            }
            className="text-blue-600 hover:underline"
          >
            Register pharmacy
          </button>
        </p>
      </div>
    </div>
  );
}
