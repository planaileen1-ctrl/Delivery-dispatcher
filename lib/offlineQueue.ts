// Minimal offline queue using IndexedDB. Stores operations and replays them when online.

// Use native IndexedDB APIs to avoid extra dependencies
import { db } from "@/lib/firebase";
import { addDoc, collection, updateDoc, doc, serverTimestamp } from "firebase/firestore";

const DB_NAME = "nexus_offline_queue";
const STORE = "queue";

type Op = {
  id?: number;
  type: string;
  payload: any;
  createdAt: number;
};

async function getDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const idb = req.result;
        if (!idb.objectStoreNames.contains(STORE)) idb.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function enqueueOperation(type: string, payload: any) {
  try {
    const idb = await getDb();
    const tx = idb.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add({ type, payload, createdAt: Date.now() } as Op);
    await new Promise((res, rej) => {
      tx.oncomplete = () => res(null);
      tx.onerror = () => rej(tx.error);
    });
  } catch (err) {
    console.warn("enqueueOperation failed:", err);
  }
}

async function clearOp(id: number) {
  try {
    const idb = await getDb();
    const tx = idb.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    await new Promise((res, rej) => {
      tx.oncomplete = () => res(null);
      tx.onerror = () => rej(tx.error);
    });
  } catch (err) {
    console.warn("clearOp failed:", err);
  }
}

async function processQueueOnce() {
  if (typeof window === "undefined") return;
  if (!navigator.onLine) return;

  try {
    const idb = await getDb();
    const tx = idb.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    const all = (await new Promise<any[]>((res, rej) => {
      req.onsuccess = () => res(req.result as any[]);
      req.onerror = () => rej(req.error);
    })) as Op[];
    for (const op of all) {
      try {
        await runOp(op.type, op.payload);
        if (op.id) await clearOp(op.id);
      } catch (err) {
        console.warn("Failed to run queued op", op.type, err);
        // leave in queue for later
      }
    }
  } catch (err) {
    console.warn("processQueueOnce failed:", err);
  }
}

async function runOp(type: string, payload: any) {
  switch (type) {
    case "recordDriverLocationPoint": {
      const writePayload = { ...payload };
      if (payload.capturedAtMs) {
        writePayload.capturedAt = serverTimestamp();
        // keep capturedAtMs for audit if desired
        writePayload.capturedAtMs = payload.capturedAtMs;
        delete writePayload.capturedAtMs; // don't duplicate client ms field unless needed
      } else {
        writePayload.capturedAt = serverTimestamp();
      }
      return addDoc(collection(db, "driver_location_points"), writePayload);
    }
    case "addDriverPharmacy":
      {
        const data = { ...(payload.data || {}) };
        if (data.connectedAtMs) {
          data.connectedAt = serverTimestamp();
          delete data.connectedAtMs;
        }
        return addDoc(collection(db, "drivers", String(payload.driverId), "pharmacies"), data);
      }
    case "addPickupSignature":
      {
        const writePayload = { ...payload };
        if (payload.createdAtMs) {
          writePayload.createdAt = serverTimestamp();
          delete writePayload.createdAtMs;
        }
        return addDoc(collection(db, "pickupSignatures"), writePayload);
      }
    case "updateOrder":
      {
        const updates = { ...(payload.updates || {}) };
        // convert *Ms fields to serverTimestamp
        Object.keys(updates).forEach((k) => {
          if (k.endsWith("Ms")) {
            const realKey = k.slice(0, -2);
            updates[realKey] = serverTimestamp();
            delete updates[k];
          }
        });
        return updateDoc(doc(db, "orders", String(payload.id)), updates);
      }
    case "updatePump":
      return updateDoc(doc(db, "pumps", String(payload.id)), payload.updates);
    case "logPumpMovement":
      // write pump movement directly to pump_movements
      return addDoc(collection(db, "pump_movements"), {
        pumpId: payload.pumpId,
        pumpNumber: payload.pumpNumber,
        pharmacyId: payload.pharmacyId,
        orderId: payload.orderId || null,
        action: payload.action,
        performedById: payload.performedById,
        performedByName: payload.performedByName,
        role: payload.role,
        timestamp: serverTimestamp(),
      });
    case "addDeliverySignature":
      {
        const writePayload = { ...payload };
        if (payload.deliveredAtMs) {
          writePayload.deliveredAt = serverTimestamp();
          delete writePayload.deliveredAtMs;
        }
        if (payload.createdAtMs) {
          writePayload.createdAt = serverTimestamp();
          delete writePayload.createdAtMs;
        }
        return addDoc(collection(db, "deliverySignatures"), writePayload);
      }
    case "updateDeliverySignature":
      {
        const updates = { ...(payload.updates || {}) };
        Object.keys(updates).forEach((k) => {
          if (k.endsWith("Ms")) {
            const realKey = k.slice(0, -2);
            updates[realKey] = serverTimestamp();
            delete updates[k];
          }
        });
        return updateDoc(doc(db, "deliverySignatures", String(payload.id)), updates);
      }
    default:
      throw new Error(`Unknown offline op type: ${type}`);
  }
}

let inited = false;
export function initOfflineQueue() {
  if (typeof window === "undefined" || inited) return;
  inited = true;

  // process on online event
  window.addEventListener("online", () => {
    void processQueueOnce();
  });

  // attempt initial processing
  void processQueueOnce();
}

export async function execOrEnqueue(type: string, payload: any, runner: () => Promise<any>) {
  try {
    // try immediate run
    return await runner();
  } catch (err) {
    // if offline or failed, enqueue for later
    try {
      await enqueueOperation(type, payload);
    } catch (e) {
      console.warn("Failed enqueue after runner error", e);
    }
    throw err; // rethrow so callers can handle UI
  }
}

export async function tryRunOrEnqueue(type: string, payload: any) {
  if (typeof window === "undefined") return;
  if (!navigator.onLine) {
    await enqueueOperation(type, payload);
    return;
  }

  try {
    await runOp(type, payload);
  } catch (err) {
    await enqueueOperation(type, payload);
  }
}
