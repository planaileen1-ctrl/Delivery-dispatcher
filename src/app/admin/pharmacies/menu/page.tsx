"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function PharmaciesMenuPage() {
  const router = useRouter();
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"cards" | "list">("cards");

  useEffect(() => {
    const loadPharmacies = async () => {
      const snapshot = await getDocs(collection(db, "pharmacies"));
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setPharmacies(data);
      setFiltered(data);
      setLoading(false);
    };

    loadPharmacies();
  }, []);

  useEffect(() => {
    const term = search.toLowerCase();

    const result = pharmacies.filter((p) =>
      [p.name, p.email, p.representative]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );

    setFiltered(result);
  }, [search, pharmacies]);

  if (loading) {
    return <p className="text-center mt-10">Loading pharmacies...</p>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* BACK */}
        <button
          onClick={() => router.push("/admin/dashboard")}
          className="mb-6 text-sm text-blue-700 hover:underline"
        >
          ← Back to Dashboard
        </button>

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Pharmacies
          </h1>

          {/* SEARCH + VIEW */}
          <div className="flex items-center gap-3">
            {/* 🔍 SEARCH */}
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search pharmacy..."
                className="pl-9 pr-3 py-2 border rounded-lg text-sm w-64"
              />
              <span className="absolute left-3 top-2.5 text-gray-400">
                🔍
              </span>
            </div>

            {/* VIEW TOGGLE */}
            <button
              onClick={() =>
                setView(view === "cards" ? "list" : "cards")
              }
              className="border px-3 py-2 rounded-lg text-sm bg-white hover:bg-gray-50"
            >
              {view === "cards" ? "List view" : "Card view"}
            </button>
          </div>
        </div>

        {/* EMPTY */}
        {filtered.length === 0 && (
          <p className="text-center text-gray-500">
            No pharmacies found
          </p>
        )}

        {/* 🧩 CARD VIEW */}
        {view === "cards" && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((pharmacy) => {
              const isSuspended = pharmacy.suspended === true;

              return (
                <div
                  key={pharmacy.id}
                  onClick={() =>
                    router.push(
                      `/admin/pharmacies/menu/${pharmacy.id}`
                    )
                  }
                  className={`rounded-2xl border shadow-sm p-6 cursor-pointer transition
                    ${
                      isSuspended
                        ? "bg-red-50 border-red-200 hover:shadow-md"
                        : "bg-white hover:shadow-xl hover:-translate-y-1"
                    }
                  `}
                >
                  <div className="flex justify-between items-start">
                    <h2 className="text-lg font-semibold text-gray-800">
                      {pharmacy.name}
                    </h2>

                    {isSuspended ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                        Suspended
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="mt-4 space-y-1">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">
                        Representative:
                      </span>{" "}
                      {pharmacy.representative}
                    </p>

                    <p className="text-xs text-gray-500">
                      {pharmacy.email}
                    </p>
                  </div>

                  <div className="mt-4 text-right">
                    <span className="text-sm text-indigo-600 font-medium">
                      Manage →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 📋 LIST VIEW */}
        {view === "list" && (
          <div className="overflow-x-auto bg-white rounded-xl shadow">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Representative</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((pharmacy) => (
                  <tr
                    key={pharmacy.id}
                    onClick={() =>
                      router.push(
                        `/admin/pharmacies/menu/${pharmacy.id}`
                      )
                    }
                    className="border-t hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="p-3 font-medium">
                      {pharmacy.name}
                    </td>
                    <td className="p-3">
                      {pharmacy.representative}
                    </td>
                    <td className="p-3 text-gray-600">
                      {pharmacy.email}
                    </td>
                    <td className="p-3">
                      {pharmacy.suspended ? (
                        <span className="text-red-600">
                          Suspended
                        </span>
                      ) : (
                        <span className="text-green-600">
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
