import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

type ServiceAccountLike = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

function buildServiceAccount(): ServiceAccountLike {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (rawJson) {
    const parsed = JSON.parse(rawJson) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };

    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is missing required fields");
    }

    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key.replace(/\\n/g, "\n"),
    };
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY"
    );
  }

  return { projectId, clientEmail, privateKey };
}

function ensureAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccount = buildServiceAccount();

  return initializeApp({
    credential: cert({
      projectId: serviceAccount.projectId,
      clientEmail: serviceAccount.clientEmail,
      privateKey: serviceAccount.privateKey,
    }),
  });
}

const adminApp = ensureAdminApp();

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
