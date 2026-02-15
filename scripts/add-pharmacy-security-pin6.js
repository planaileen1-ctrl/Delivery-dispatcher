#!/usr/bin/env node
/**
 * Script: add-pharmacy-security-pin6.js
 *
 * Backfills `securityPin6` for existing pharmacy documents that do not have it.
 *
 * Usage examples:
 *   node scripts/add-pharmacy-security-pin6.js --dryRun
 *   node scripts/add-pharmacy-security-pin6.js
 *   node scripts/add-pharmacy-security-pin6.js --pharmacyId=DOC_ID --dryRun
 *   node scripts/add-pharmacy-security-pin6.js --pharmacyId=DOC_ID
 *
 * Credentials:
 *   - Set GOOGLE_APPLICATION_CREDENTIALS
 *   - or pass --serviceAccount=./service-account.json
 */

const admin = require("firebase-admin");

function parseArgs(argv) {
  const out = {};
  for (const raw of argv) {
    if (!raw.startsWith("--")) continue;
    const eq = raw.indexOf("=");
    if (eq === -1) {
      out[raw.slice(2)] = true;
      continue;
    }
    const key = raw.slice(2, eq);
    const value = raw.slice(eq + 1);
    out[key] = value;
  }
  return out;
}

function generateSecurityPin6() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const argv = parseArgs(process.argv.slice(2));
const svcPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || argv.serviceAccount;

try {
  if (svcPath) {
    const svc = require(svcPath);
    admin.initializeApp({ credential: admin.credential.cert(svc) });
    console.log("Initialized Firebase Admin with service account file");
  } else {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
    console.log("Initialized Firebase Admin with application default credentials (ADC)");
  }
} catch (err) {
  console.error(
    "Failed to initialize Firebase Admin. Provide --serviceAccount=path.json or set GOOGLE_APPLICATION_CREDENTIALS:",
    err.message || err
  );
  process.exit(1);
}

const db = admin.firestore();

function hasValidSecurityPin6(data) {
  const value = String(data?.securityPin6 || "");
  return /^\d{6}$/.test(value);
}

async function run() {
  const dryRun = Boolean(argv.dryRun);
  const pharmacyId = argv.pharmacyId ? String(argv.pharmacyId) : "";

  console.log("Starting pharmacy securityPin6 migration", {
    dryRun,
    pharmacyId: pharmacyId || null,
  });

  let scanned = 0;
  let updated = 0;

  if (pharmacyId) {
    const ref = db.collection("pharmacies").doc(pharmacyId);
    const snap = await ref.get();

    if (!snap.exists) {
      console.log("Pharmacy not found", { pharmacyId });
      process.exit(0);
    }

    scanned = 1;
    const data = snap.data() || {};

    if (hasValidSecurityPin6(data)) {
      console.log("Pharmacy already has valid securityPin6", { pharmacyId });
      process.exit(0);
    }

    const securityPin6 = generateSecurityPin6();

    if (dryRun) {
      console.log("[DRY RUN] Would update pharmacy", {
        pharmacyId,
        pharmacyName: data.pharmacyName || null,
        securityPin6,
      });
    } else {
      await ref.update({
        securityPin6,
        securityPin6MigratedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      updated = 1;
      console.log("Updated pharmacy", {
        pharmacyId,
        pharmacyName: data.pharmacyName || null,
        securityPin6,
      });
    }

    console.log("Migration finished", { scanned, updated, dryRun });
    process.exit(0);
  }

  const snap = await db.collection("pharmacies").get();
  scanned = snap.size;

  if (snap.empty) {
    console.log("No pharmacy documents found");
    process.exit(0);
  }

  let batch = null;
  if (!dryRun) batch = db.batch();
  let batchWrites = 0;

  for (const d of snap.docs) {
    const data = d.data() || {};
    if (hasValidSecurityPin6(data)) continue;

    const securityPin6 = generateSecurityPin6();

    if (dryRun) {
      console.log("[DRY RUN] Would update pharmacy", {
        pharmacyId: d.id,
        pharmacyName: data.pharmacyName || null,
        securityPin6,
      });
      updated += 1;
      continue;
    }

    batch.update(d.ref, {
      securityPin6,
      securityPin6MigratedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    updated += 1;
    batchWrites += 1;

    if (batchWrites >= 450) {
      await batch.commit();
      batch = db.batch();
      batchWrites = 0;
    }
  }

  if (!dryRun && batchWrites > 0 && batch) {
    await batch.commit();
  }

  console.log("Migration finished", { scanned, updated, dryRun });
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
