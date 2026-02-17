import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

function extractBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return "";
  return authHeader.slice("Bearer ".length);
}

export async function GET(req: Request) {
  const token = extractBearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token, true);
    const doc = await adminDb.collection("authProfiles").doc(decoded.uid).get();
    const profile = doc.exists ? doc.data() : null;

    return NextResponse.json({
      uid: decoded.uid,
      email: decoded.email || profile?.email || "",
      role: decoded.role || profile?.role || "",
      pharmacyId: decoded.pharmacyId || profile?.pharmacyId || null,
      legacyId: decoded.legacyId || profile?.legacyId || null,
      fullName: decoded.name || profile?.fullName || "",
    });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
