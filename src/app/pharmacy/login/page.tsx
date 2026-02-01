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

      /* =======================
         PHARMACY
      ======================= */
      const pharmacySnap = await getDocs(
        query(
          collection(db, "pharmacies"),
          where("pin", "==", pharmacyPin)
        )
      );

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

      /* =======================
         EMPLOYEE (CLAVE)
      ======================= */
      const employeeSnap = await getDocs(
        query(
          collection(db, "pharmacyEmployees"),
          where("pin", "==", employeePin),
          where("active", "==", true)
        )
      );

      if (employeeSnap.empty) {
        setError("Invalid employee PIN");
        return;
      }

      // Buscar empleado que pertenezca a ESTA farmacia
      const employeeDoc = employeeSnap.docs.find(
        (doc) => doc.data().pharmacyId === pharmacyDoc.id
      );

      if (!employeeDoc) {
        setError("Employee does not belong to this pharmacy");
        return;
      }

      const employeeData = employeeDoc.data();

      /* =======================
         SESSION
      ======================= */
      localStorage.setItem(
        "pharmacy",
        JSON.stringify({
          id: pharmacyDoc.id,
          name: pharmacyData.name,
          email: pharmacyData.email,
          state: pharmacyData.state,
          county: pharmacyData.county,
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
    } catch (err) {
      console.error(err);
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

        <input
          value={pharmacyPin}
          onChange={(e) =>
            setPharmacyPin(e.target.value.replace(/\D/g, ""))
          }
          maxLength={4}
          className="w-full text-center text-2xl tracking-widest border p-3"
          placeholder="Pharmacy PIN"
        />

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
          className="w-full bg-green-600 text-white py-3 rounded"
        >
          {loading ? "Checking..." : "Enter"}
        </button>

        <p className="text-center text-sm text-gray-500">
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
