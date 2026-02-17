import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export type AuthV2Profile = {
  uid: string;
  email: string;
  role: "DRIVER" | "EMPLOYEE" | "PHARMACY_ADMIN" | "NEXUS_ADMIN" | "";
  pharmacyId: string | null;
  legacyId: string | null;
  fullName: string;
};

export async function loginWithEmailPassword(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const token = await cred.user.getIdToken(true);

  const res = await fetch("/api/auth/profile", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Profile fetch failed");
  }

  return (await res.json()) as AuthV2Profile;
}

export function applyLegacySessionFromProfile(profile: AuthV2Profile) {
  const now = new Date().toISOString();

  localStorage.removeItem("NEXUS_ADMIN");

  if (profile.role === "NEXUS_ADMIN") {
    localStorage.setItem("NEXUS_ADMIN", "true");
    return { redirectTo: "/admin" };
  }

  if (profile.role === "DRIVER") {
    localStorage.setItem("DRIVER_ID", profile.legacyId || profile.uid);
    localStorage.setItem("DRIVER_NAME", profile.fullName || profile.email);
    return { redirectTo: "/driver/dashboard" };
  }

  if (profile.role === "PHARMACY_ADMIN") {
    if (profile.pharmacyId) {
      localStorage.setItem("PHARMACY_ID", profile.pharmacyId);
    }
    localStorage.setItem("PHARMACY_NAME", profile.fullName || "Pharmacy Admin");
    localStorage.setItem("PHARMACY_LOGIN_AT", now);
    localStorage.setItem("EMPLOYEE_ID", profile.legacyId || profile.uid);
    localStorage.setItem("EMPLOYEE_NAME", profile.fullName || profile.email);
    localStorage.setItem("EMPLOYEE_EMAIL", profile.email || "");
    localStorage.setItem("EMPLOYEE_ROLE", "PHARMACY_ADMIN");
    localStorage.setItem("EMPLOYEE_LOGIN_AT", now);
    return { redirectTo: "/pharmacy/dashboard" };
  }

  if (profile.role === "EMPLOYEE") {
    if (profile.pharmacyId) {
      localStorage.setItem("PHARMACY_ID", profile.pharmacyId);
    }
    localStorage.setItem("EMPLOYEE_ID", profile.legacyId || profile.uid);
    localStorage.setItem("EMPLOYEE_NAME", profile.fullName || profile.email);
    localStorage.setItem("EMPLOYEE_EMAIL", profile.email || "");
    localStorage.setItem("EMPLOYEE_ROLE", "EMPLOYEE");
    localStorage.setItem("EMPLOYEE_LOGIN_AT", now);
    return { redirectTo: "/employee/dashboard" };
  }

  throw new Error("Role not configured for Auth v2");
}
