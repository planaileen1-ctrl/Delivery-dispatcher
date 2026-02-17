# Auth V2 Phase 1 — Parallel Login (No Legacy Break)

Last updated: 2026-02-17

Objective: introduce a stronger login path without removing current PIN login or changing Firestore rules yet.

## What was added

- New login page: `/auth/login-v2`
- New API: `POST /api/auth/bootstrap-user` (creates/updates Firebase Auth users + custom claims)
- New API: `GET /api/auth/profile` (verifies ID token and returns role context)
- New server helper: `lib/firebaseAdmin.ts`

Legacy flow (`/auth/login`) remains unchanged.

## Required env vars

For server (Next.js API routes):

- `AUTH_BOOTSTRAP_SECRET`
- One of:
  - `FIREBASE_SERVICE_ACCOUNT_JSON`
  - or `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`

Client Firebase envs already exist in `lib/firebase.ts` and are still used.

## Bootstrap users (phase 1 migration)

Use `POST /api/auth/bootstrap-user` with header `x-bootstrap-secret`.

Example payload:

```json
{
  "email": "employee@company.com",
  "password": "TempStrongPass!2026",
  "role": "EMPLOYEE",
  "fullName": "Employee Name",
  "pharmacyId": "PHARMACY_DOC_ID",
  "legacyId": "EMPLOYEE_DOC_ID"
}
```

Notes:

- `legacyId` keeps compatibility with existing localStorage-based pages.
- `pharmacyId` is required for tenant pages that currently depend on `PHARMACY_ID`.

## Safe rollout order (no blocking)

1. Deploy app code with new login v2.
2. Bootstrap a small pilot group (1 pharmacy admin, 1 employee, 1 driver).
3. Validate they can login via `/auth/login-v2` and reach dashboards.
4. Keep everyone else on `/auth/login` (PIN) during pilot.
5. Expand bootstrap coverage gradually.

Do not tighten Firestore rules in this phase.

## Why this avoids downtime

- No existing route or legacy auth logic was removed.
- No Firestore rules were changed.
- If v2 fails for a user, they can still use legacy PIN login.
