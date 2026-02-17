import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

type BootstrapBody = {
  email: string;
  password: string;
  role: "DRIVER" | "EMPLOYEE" | "PHARMACY_ADMIN" | "NEXUS_ADMIN";
  fullName?: string;
  pharmacyId?: string;
  legacyId?: string;
};

function isAllowedRole(role: string): role is BootstrapBody["role"] {
  return ["DRIVER", "EMPLOYEE", "PHARMACY_ADMIN", "NEXUS_ADMIN"].includes(role);
}

export async function POST(req: Request) {
  const secret = process.env.AUTH_BOOTSTRAP_SECRET;
  const incomingSecret = req.headers.get("x-bootstrap-secret") || "";

  if (!secret) {
    return NextResponse.json(
      { error: "Missing AUTH_BOOTSTRAP_SECRET on server" },
      { status: 500 }
    );
  }

  if (incomingSecret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: BootstrapBody;
  try {
    body = (await req.json()) as BootstrapBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  const role = (body.role || "").trim();

  if (!email || !password || !role) {
    return NextResponse.json(
      { error: "email, password and role are required" },
      { status: 400 }
    );
  }

  if (!isAllowedRole(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  if (password.length < 10) {
    return NextResponse.json(
      { error: "Password must be at least 10 characters" },
      { status: 400 }
    );
  }

  try {
    let userRecord;

    try {
      userRecord = await adminAuth.getUserByEmail(email);
      userRecord = await adminAuth.updateUser(userRecord.uid, {
        password,
        displayName: body.fullName || userRecord.displayName || undefined,
        disabled: false,
      });
    } catch {
      userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: body.fullName || undefined,
      });
    }

    const claims: Record<string, string> = { role };
    if (body.pharmacyId) claims.pharmacyId = body.pharmacyId;
    if (body.legacyId) claims.legacyId = body.legacyId;

    await adminAuth.setCustomUserClaims(userRecord.uid, claims);

    await adminDb.collection("authProfiles").doc(userRecord.uid).set(
      {
        uid: userRecord.uid,
        email,
        role,
        fullName: body.fullName || "",
        pharmacyId: body.pharmacyId || null,
        legacyId: body.legacyId || null,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true, uid: userRecord.uid });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Bootstrap user failed", details: message },
      { status: 500 }
    );
  }
}
