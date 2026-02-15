/**
 * ⚠️ PROTECTED FILE — DO NOT MODIFY ⚠️
 *
 * This file is STABLE and WORKING.
 * Do NOT refactor, rename, or change logic without explicit approval.
 *
 * Changes allowed:
 * ✅ Add new functions
 * ❌ Modify existing behavior
 *
 * Last verified: 2026-02-09
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, onSnapshot, query } from "firebase/firestore";
import { db, ensureAnonymousAuth } from "@/lib/firebase";
import {
  createLicense,
  suspendLicense,
  cancelLicense,
  deleteLicense,
} from "@/lib/licenses";
import { sendAppEmail } from "@/lib/emailClient";

const DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
};

type License = {
  id: string;
  code: string;
  email: string;
  status: "ACTIVE" | "SUSPENDED" | "CANCELLED";
};

type PharmacyItem = {
  id: string;
  pharmacyName: string;
  email?: string;
  city?: string;
  active?: boolean;
};

type DriverItem = {
  id: string;
  fullName: string;
  email?: string;
  city?: string;
  active?: boolean;
};

export default function AdminPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [licenses, setLicenses] = useState<License[]>([]);
  const [pharmacies, setPharmacies] = useState<PharmacyItem[]>([]);
  const [drivers, setDrivers] = useState<DriverItem[]>([]);
  const [pharmacySearch, setPharmacySearch] = useState("");
  const [driverSearch, setDriverSearch] = useState("");
  const [licenseSearch, setLicenseSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState<"dashboard" | "pharmacies" | "drivers" | "create-license">("dashboard");
  const [stats, setStats] = useState({
    registeredPharmacies: 0,
    registeredDrivers: 0,
    totalLicenses: 0,
    activeLicenses: 0,
    suspendedLicenses: 0,
    cancelledLicenses: 0,
  });

  // 🔐 Protect admin route
  useEffect(() => {
    const isAdmin = localStorage.getItem("NEXUS_ADMIN");
    if (!isAdmin) {
      router.push("/");
    }
  }, [router]);

  // 📋 Load existing licenses on mount
  useEffect(() => {
    let unsubLicenses: null | (() => void) = null;
    let unsubPharmacies: null | (() => void) = null;
    let unsubDrivers: null | (() => void) = null;

    (async () => {
      try {
        await ensureAnonymousAuth();

        unsubLicenses = onSnapshot(query(collection(db, "licenses")), (snap) => {
          const loadedLicenses: License[] = snap.docs.map((doc) => ({
            id: doc.id,
            code: doc.data().code,
            email: doc.data().email,
            status: doc.data().status,
          }));

          setLicenses(loadedLicenses);
        });

        unsubPharmacies = onSnapshot(query(collection(db, "pharmacies")), (snap) => {
          const list: PharmacyItem[] = snap.docs
            .map((doc) => ({
              id: doc.id,
              pharmacyName: String(doc.data().pharmacyName || "").trim() || "Unnamed Pharmacy",
              email: doc.data().email || "",
              city: doc.data().city || "",
              active: doc.data().active !== false,
            }))
            .sort((a, b) => a.pharmacyName.localeCompare(b.pharmacyName));

          setPharmacies(list);
        });

        unsubDrivers = onSnapshot(query(collection(db, "drivers")), (snap) => {
          const list: DriverItem[] = snap.docs
            .map((doc) => ({
              id: doc.id,
              fullName: String(doc.data().fullName || "").trim() || "Unnamed Driver",
              email: doc.data().email || "",
              city: doc.data().city || "",
              active: doc.data().active !== false,
            }))
            .sort((a, b) => a.fullName.localeCompare(b.fullName));

          setDrivers(list);
        });
      } catch (err) {
        console.error("Error setting realtime listeners:", err);
      }
    })();

    return () => {
      if (unsubLicenses) unsubLicenses();
      if (unsubPharmacies) unsubPharmacies();
      if (unsubDrivers) unsubDrivers();
    };
  }, []);

  async function loadLicenses() {
    try {
      await ensureAnonymousAuth();
      const licensesSnap = await getDocs(query(collection(db, "licenses")));
      const loadedLicenses: License[] = licensesSnap.docs.map((doc) => ({
        id: doc.id,
        code: doc.data().code,
        email: doc.data().email,
        status: doc.data().status,
      }));
      setLicenses(loadedLicenses);
      return loadedLicenses;
    } catch (err) {
      console.error("Error loading licenses:", err);
      return [] as License[];
    }
  }

  useEffect(() => {
    setStats({
      registeredPharmacies: pharmacies.length,
      registeredDrivers: drivers.length,
      totalLicenses: licenses.length,
      activeLicenses: licenses.filter((license) => license.status === "ACTIVE").length,
      suspendedLicenses: licenses.filter((license) => license.status === "SUSPENDED").length,
      cancelledLicenses: licenses.filter((license) => license.status === "CANCELLED").length,
    });
  }, [pharmacies, drivers, licenses]);

  async function handleCreateLicense() {
    if (!email) return;

    setLoading(true);

    const result = await createLicense(email);

    const sentAt = new Date().toLocaleString("en-US", DATE_TIME_FORMAT);
    await sendAppEmail({
      to: email,
      subject: "Your Nexus License Code",
      html: `
        <p>Hello,</p>
        <p>Your Nexus license code has been created.</p>
        <p><strong>License Code:</strong> ${result.code}</p>
        <p><strong>Created:</strong> ${sentAt}</p>
        <p>Please keep this code secure.</p>
      `,
      text: `Your Nexus license code: ${result.code}. Created: ${sentAt}.`,
    });

    setEmail("");
    
    // Realtime listener will refresh licenses automatically
    setLoading(false);
  }

  async function handleSuspend(id: string) {
    await suspendLicense(id);
  }

  async function handleCancel(id: string) {
    await cancelLicense(id);
  }

  async function handleDelete(id: string) {
    await deleteLicense(id);
  }

  const filteredPharmacies = pharmacies.filter((pharmacy) => {
    const q = pharmacySearch.trim().toUpperCase();
    if (!q) return true;

    return (
      String(pharmacy.pharmacyName || "").toUpperCase().includes(q) ||
      String(pharmacy.email || "").toUpperCase().includes(q) ||
      String(pharmacy.city || "").toUpperCase().includes(q)
    );
  });

  const filteredDrivers = drivers.filter((driver) => {
    const q = driverSearch.trim().toUpperCase();
    if (!q) return true;

    return (
      String(driver.fullName || "").toUpperCase().includes(q) ||
      String(driver.email || "").toUpperCase().includes(q) ||
      String(driver.city || "").toUpperCase().includes(q)
    );
  });

  const filteredLicenses = licenses.filter((license) => {
    const q = licenseSearch.trim().toUpperCase();
    if (!q) return true;

    return (
      String(license.code || "").toUpperCase().includes(q) ||
      String(license.email || "").toUpperCase().includes(q) ||
      String(license.status || "").toUpperCase().includes(q)
    );
  });

  return (
    <main className="min-h-screen bg-[#020617] text-white px-4 py-8">
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
        <aside className="bg-[#020617] border border-slate-800 rounded-xl p-5 h-fit">
          <h1 className="text-lg font-bold mb-4">Super Admin</h1>
          <p className="text-xs text-slate-400 mb-4">Main Menu</p>

          <div className="space-y-2">
            <button
              onClick={() => setCurrentView("dashboard")}
              className={`w-full text-left px-3 py-2 rounded text-sm border ${
                currentView === "dashboard"
                  ? "bg-indigo-600/30 border-indigo-500/50 text-indigo-100"
                  : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentView("create-license")}
              className={`w-full text-left px-3 py-2 rounded text-sm border ${
                currentView === "create-license"
                  ? "bg-indigo-600/30 border-indigo-500/50 text-indigo-100"
                  : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
              }`}
            >
              Create License
            </button>
            <button
              onClick={() => setCurrentView("pharmacies")}
              className={`w-full text-left px-3 py-2 rounded text-sm border ${
                currentView === "pharmacies"
                  ? "bg-indigo-600/30 border-indigo-500/50 text-indigo-100"
                  : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
              }`}
            >
              Registered Pharmacies
            </button>
            <button
              onClick={() => setCurrentView("drivers")}
              className={`w-full text-left px-3 py-2 rounded text-sm border ${
                currentView === "drivers"
                  ? "bg-indigo-600/30 border-indigo-500/50 text-indigo-100"
                  : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
              }`}
            >
              Registered Drivers
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <button
              onClick={() => router.push("/")}
              className="text-sm text-slate-400 hover:text-white"
            >
              ← Back to Main Menu
            </button>
          </div>
        </aside>

        <section className="bg-[#020617] border border-slate-800 rounded-xl p-6 shadow-xl">
          {currentView === "dashboard" && (
            <div className="space-y-5">
              <h2 className="text-2xl font-semibold">Super Admin Dashboard</h2>
              <p className="text-sm text-slate-400">Overview of platform registrations and license status.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Registered Pharmacies</p>
                  <p className="text-3xl font-black text-emerald-300 mt-1">{stats.registeredPharmacies}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Registered Drivers</p>
                  <p className="text-3xl font-black text-cyan-300 mt-1">{stats.registeredDrivers}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Total Licenses</p>
                  <p className="text-3xl font-black text-indigo-300 mt-1">{stats.totalLicenses}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Active Licenses</p>
                  <p className="text-3xl font-black text-green-300 mt-1">{stats.activeLicenses}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Suspended Licenses</p>
                  <p className="text-3xl font-black text-yellow-300 mt-1">{stats.suspendedLicenses}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Cancelled Licenses</p>
                  <p className="text-3xl font-black text-rose-300 mt-1">{stats.cancelledLicenses}</p>
                </div>
              </div>
            </div>
          )}

          {currentView === "pharmacies" && (
            <div className="space-y-5">
              <h2 className="text-2xl font-semibold">Registered Pharmacies</h2>
              <p className="text-sm text-slate-400">Realtime list of all pharmacy records.</p>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Search pharmacies</label>
                <input
                  type="text"
                  value={pharmacySearch}
                  onChange={(e) => setPharmacySearch(e.target.value)}
                  placeholder="Name, email, or city"
                  className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-sm"
                />
              </div>

              {filteredPharmacies.length === 0 && (
                <p className="text-sm text-slate-400">No pharmacies found.</p>
              )}

              <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
                {filteredPharmacies.map((pharmacy) => (
                  <div key={pharmacy.id} className="bg-slate-900 border border-slate-800 rounded p-4">
                    <p className="text-sm font-semibold text-emerald-200">{pharmacy.pharmacyName}</p>
                    <p className="text-xs text-slate-400 mt-1">{pharmacy.email || "No email"}</p>
                    <p className="text-xs text-slate-500 mt-1">City: {pharmacy.city || "—"}</p>
                    <p className="text-xs mt-2">
                      Status: {pharmacy.active ? "ACTIVE" : "INACTIVE"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentView === "drivers" && (
            <div className="space-y-5">
              <h2 className="text-2xl font-semibold">Registered Drivers</h2>
              <p className="text-sm text-slate-400">Realtime list of all driver records.</p>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Search drivers</label>
                <input
                  type="text"
                  value={driverSearch}
                  onChange={(e) => setDriverSearch(e.target.value)}
                  placeholder="Name, email, or city"
                  className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-sm"
                />
              </div>

              {filteredDrivers.length === 0 && (
                <p className="text-sm text-slate-400">No drivers found.</p>
              )}

              <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
                {filteredDrivers.map((driver) => (
                  <div key={driver.id} className="bg-slate-900 border border-slate-800 rounded p-4">
                    <p className="text-sm font-semibold text-cyan-200">{driver.fullName}</p>
                    <p className="text-xs text-slate-400 mt-1">{driver.email || "No email"}</p>
                    <p className="text-xs text-slate-500 mt-1">City: {driver.city || "—"}</p>
                    <p className="text-xs mt-2">
                      Status: {driver.active ? "ACTIVE" : "INACTIVE"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentView === "create-license" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Super Admin – License Management</h2>

              <div>
                <label className="block text-sm mb-2">Pharmacy Email</label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pharmacy@email.com"
                  className="w-full px-4 py-2 rounded bg-slate-900 border border-slate-700 mb-4"
                />

                <button
                  onClick={handleCreateLicense}
                  disabled={loading}
                  className="w-full py-2 rounded bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? "CREATING..." : "CREATE LICENSE"}
                </button>
              </div>

              <div>
                <h3 className="text-lg mb-4">Generated Licenses</h3>

                <div className="mb-4">
                  <label className="block text-xs text-slate-400 mb-1">Search licenses</label>
                  <input
                    type="text"
                    value={licenseSearch}
                    onChange={(e) => setLicenseSearch(e.target.value)}
                    placeholder="Code, email, or status"
                    className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-sm"
                  />
                </div>

                {filteredLicenses.length === 0 && (
                  <p className="text-sm text-slate-400">No licenses created yet.</p>
                )}

                <ul className="space-y-4">
                  {filteredLicenses.map((license) => (
                    <li
                      key={license.id}
                      className="bg-slate-900 border border-slate-800 rounded p-4"
                    >
                      <p className="text-sm mb-1">
                        <strong>Code:</strong>{" "}
                        <span className="text-indigo-400">{license.code}</span>
                      </p>
                      <p className="text-xs text-slate-400 mb-2">{license.email}</p>
                      <p className="text-xs mb-3">
                        Status: <span className="font-semibold">{license.status}</span>
                      </p>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSuspend(license.id)}
                          className="px-3 py-1 text-xs rounded bg-yellow-600 hover:bg-yellow-700"
                        >
                          Suspend
                        </button>
                        <button
                          onClick={() => handleCancel(license.id)}
                          className="px-3 py-1 text-xs rounded bg-red-600 hover:bg-red-700"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDelete(license.id)}
                          className="px-3 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
