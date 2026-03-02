/**
 * ⚠️ PROTECTED FILE — DRIVER DASHBOARD
 *
 * This file ONLY ADDS new functionality.
 * DOES NOT REMOVE OR BREAK ANY EXISTING LOGIC.
 *
 * Last verified: 2026-02-09
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Truck, RotateCcw, Link2, FileText, PackageOpen, AlertTriangle } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { requestNotificationPermission, saveNotificationToken } from "@/lib/pushNotifications";
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  query,
  where,
  serverTimestamp,
  updateDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { db, ensureAnonymousAuth } from "@/lib/firebase";
import { logPumpMovement } from "@/lib/pumpLogger";
import { initOfflineQueue, execOrEnqueue, tryRunOrEnqueue } from "@/lib/offlineQueue";
import { sendAppEmail } from "@/lib/emailClient";
import DeliverySignature from "@/components/DeliverySignature";
import { uploadSignatureToStorage } from "@/lib/uploadSignature";
import { generateSHA256Hash } from "@/lib/hashSignature";
import { generateDeliveryPDF } from "@/lib/generateDeliveryPDF";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

/* ---------- Types ---------- */
type Pharmacy = {
  id: string;
  pharmacyId: string;
  pharmacyName: string;
  city: string;
  state: string;
  country: string;
};

type Order = {
  id: string;
  pharmacyId: string;
  pharmacyName: string;
  customerId?: string;
  pumpNumbers: string[];
  eKitCodes?: string[];
  customerName: string;
  customerCity?: string;
  customerAddress?: string;
  customerState?: string;
  customerCountry?: string;
  customerPreviousPumps?: string[];
  returnReminderNote?: string;
  previousPumpsStatus?: { pumpNumber: string; returned: boolean; reason?: string }[];
  previousPumpsReturnToPharmacy?: {
    pumpNumber: string;
    returnedToPharmacy: boolean;
  }[];
  status: string;
  driverId?: string;
  driverName?: string;
  createdAt: any;
  statusUpdatedAt?: any;
  assignedAt?: any;
  startedAt?: any;
  arrivedAt?: any;
  arrivedAtISO?: string;
  deliveredAt?: any;
  deliveredAtISO?: string;
  legalPdfUrl?: string;
  driverLatitude?: number;
  driverLongitude?: number;
};

async function getDriverCurrentLocation(
  options?: { timeoutMs?: number; maximumAge?: number }
): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;

  const timeoutMs = options?.timeoutMs ?? 8000;
  const maximumAge = options?.maximumAge ?? 0;

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge,
      });
    });

    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };
  } catch {
    return null;
  }
}

async function getClientIpWithTimeout(timeoutMs = 1200): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch("https://api.ipify.org?format=json", {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) return "";
    const data = await res.json();
    return (data?.ip as string) || "";
  } catch {
    return "";
  }
}

const DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
};

function formatDateTime(value: string | number | Date) {
  return new Date(value).toLocaleString("en-US", DATE_TIME_FORMAT);
}

type SignatureSimilarity = {
  score: number | null;
  referenceSignatureId: string | null;
  comparedReferenceCount: number;
};

type SignatureMetrics = {
  strokeCount: number;
  pointCount: number;
  pathLength: number;
};

function toMillis(ts: any) {
  if (!ts) return 0;
  if (typeof ts === "string") return new Date(ts).getTime();
  if (typeof ts?.seconds === "number") return ts.seconds * 1000;
  if (typeof ts?.toDate === "function") return ts.toDate().getTime();
  return 0;
}

async function getPickupEmployeeSignature(orderId: string): Promise<string> {
  try {
    const pickupQ = query(
      collection(db, "pickupSignatures"),
      where("orderId", "==", orderId)
    );

    const pickupSnap = await getDocs(pickupQ);
    if (pickupSnap.empty) return "";

    const latestPickup = pickupSnap.docs
      .map((docSnap) => docSnap.data() as any)
      .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))[0];

    const signatureValue = String(
      latestPickup?.employeeSignature || latestPickup?.signature || ""
    ).trim();

    return signatureValue;
  } catch (error) {
    console.warn("Failed to load pickup employee signature:", error);
    return "";
  }
}

async function signatureToInkVector(dataUrl: string, width = 160, height = 60) {
  if (typeof document === "undefined") return null;

  return new Promise<Uint8Array | null>((resolve) => {
    const image = new Image();
    image.onload = () => {
      try {
        const sourceCanvas = document.createElement("canvas");
        sourceCanvas.width = image.width;
        sourceCanvas.height = image.height;
        const sourceCtx = sourceCanvas.getContext("2d");
        if (!sourceCtx) {
          resolve(null);
          return;
        }

        sourceCtx.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);
        sourceCtx.drawImage(image, 0, 0, sourceCanvas.width, sourceCanvas.height);

        const sourcePixels = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height).data;

        let minX = sourceCanvas.width;
        let minY = sourceCanvas.height;
        let maxX = -1;
        let maxY = -1;

        for (let y = 0; y < sourceCanvas.height; y++) {
          for (let x = 0; x < sourceCanvas.width; x++) {
            const offset = (y * sourceCanvas.width + x) * 4;
            const alpha = sourcePixels[offset + 3];
            if (alpha > 20) {
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (maxX < 0 || maxY < 0) {
          resolve(null);
          return;
        }

        const bboxWidth = Math.max(1, maxX - minX + 1);
        const bboxHeight = Math.max(1, maxY - minY + 1);

        const normalizedCanvas = document.createElement("canvas");
        normalizedCanvas.width = width;
        normalizedCanvas.height = height;
        const normalizedCtx = normalizedCanvas.getContext("2d");
        if (!normalizedCtx) {
          resolve(null);
          return;
        }

        normalizedCtx.clearRect(0, 0, width, height);

        const padding = 4;
        const targetWidth = Math.max(1, width - padding * 2);
        const targetHeight = Math.max(1, height - padding * 2);

        normalizedCtx.drawImage(
          sourceCanvas,
          minX,
          minY,
          bboxWidth,
          bboxHeight,
          padding,
          padding,
          targetWidth,
          targetHeight
        );

        const pixels = normalizedCtx.getImageData(0, 0, width, height).data;
        const ink = new Uint8Array(width * height);

        for (let i = 0; i < width * height; i++) {
          const offset = i * 4;
          const alpha = pixels[offset + 3];
          ink[i] = alpha > 20 ? 1 : 0;
        }

        resolve(ink);
      } catch {
        resolve(null);
      }
    };

    image.onerror = () => resolve(null);
    image.src = dataUrl;
  });
}

function compareInkVectors(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length || a.length === 0) return null;

  let intersection = 0;
  let inkA = 0;
  let inkB = 0;
  let equalPixels = 0;

  for (let i = 0; i < a.length; i++) {
    const av = a[i] === 1;
    const bv = b[i] === 1;

    if (av) inkA += 1;
    if (bv) inkB += 1;
    if (av && bv) intersection += 1;
    if (av === bv) equalPixels += 1;
  }

  if (inkA === 0 || inkB === 0) return 0;

  const dice = (2 * intersection) / (inkA + inkB);
  const pixelAgreement = equalPixels / a.length;

  const densityA = inkA / a.length;
  const densityB = inkB / b.length;
  const densityPenalty = Math.max(0, 1 - Math.abs(densityA - densityB) * 3);

  const score = Math.max(0, Math.min(1, dice * 0.75 + pixelAgreement * 0.15 + densityPenalty * 0.1));

  return Number(score.toFixed(4));
}

function formatSimilarityPercent(score: number | null | undefined) {
  if (typeof score !== "number") return "—";
  return `${Math.round(score * 100)}%`;
}

async function compareSignatures(inputSignature: string, referenceSignature: string) {
  const [inputVector, referenceVector] = await Promise.all([
    signatureToInkVector(inputSignature),
    signatureToInkVector(referenceSignature),
  ]);

  if (!inputVector || !referenceVector) return null;
  return compareInkVectors(inputVector, referenceVector);
}

async function validateCustomerSignatureQuality(dataUrl: string): Promise<{
  valid: boolean;
  reason?: string;
}>
{
  if (typeof document === "undefined") {
    return { valid: true };
  }

  const image = await new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });

  if (!image) {
    return {
      valid: false,
      reason: "Customer signature is invalid. Please sign again with full name or proper rubric.",
    };
  }

  const canvas = document.createElement("canvas");
  canvas.width = image.width || 400;
  canvas.height = image.height || 200;

  const ctx = canvas.getContext("2d");
  if (!ctx) return { valid: true };

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const isInk = (x: number, y: number) => {
    const idx = (y * canvas.width + x) * 4;
    return pixels[idx + 3] > 20;
  };

  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = -1;
  let maxY = -1;
  let inkPixels = 0;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (!isInk(x, y)) continue;
      inkPixels += 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (inkPixels < 180 || maxX < 0 || maxY < 0) {
    return {
      valid: false,
      reason: "Simple signatures are not allowed. Please use a real signature or full-name rubric.",
    };
  }

  const bboxWidth = maxX - minX + 1;
  const bboxHeight = maxY - minY + 1;
  const bboxArea = bboxWidth * bboxHeight;
  const inkCoverage = bboxArea > 0 ? inkPixels / bboxArea : 0;

  if (bboxWidth < 48 || bboxHeight < 22) {
    return {
      valid: false,
      reason: "Signature must cover more area. Single-line marks are not allowed.",
    };
  }

  const occupiedRows = new Set<number>();
  const occupiedCols = new Set<number>();
  let transitions = 0;
  let horizontalChanges = 0;
  let verticalChanges = 0;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const current = isInk(x, y);
      if (!current) continue;

      occupiedRows.add(y);
      occupiedCols.add(x);

      if (x < maxX && current !== isInk(x + 1, y)) {
        transitions += 1;
        horizontalChanges += 1;
      }
      if (y < maxY && current !== isInk(x, y + 1)) {
        transitions += 1;
        verticalChanges += 1;
      }
    }
  }

  if (occupiedRows.size < 16 || occupiedCols.size < 28) {
    return {
      valid: false,
      reason: "Signature looks too short. Please sign clearly with a full rubric.",
    };
  }

  if (inkCoverage < 0.045) {
    return {
      valid: false,
      reason: "Simple signatures are not allowed (line/X/S-like marks). Please sign fully.",
    };
  }

  if (horizontalChanges < 80 || verticalChanges < 80) {
    return {
      valid: false,
      reason: "Signature is too basic. Please provide a complete handwritten signature.",
    };
  }

  if (transitions < 220) {
    return {
      valid: false,
      reason: "Simple signatures are not allowed (line/X/S-like marks). Please sign with full name or rubric.",
    };
  }

  return { valid: true };
}

function validateCustomerSignatureMetrics(metrics: SignatureMetrics | null): {
  valid: boolean;
  reason?: string;
} {
  if (!metrics) {
    return {
      valid: false,
      reason: "Customer signature is missing. Please sign with a full handwritten signature.",
    };
  }

  if (metrics.strokeCount < 3) {
    return {
      valid: false,
      reason: "Simple signatures are not allowed. Please write a full signature (more than 3 letters).",
    };
  }

  if (metrics.pointCount < 90 || metrics.pathLength < 260) {
    return {
      valid: false,
      reason: "Signature is too short. Please sign with a full handwritten signature (more than 3 letters).",
    };
  }

  return { valid: true };
}

async function computeDriverSignatureSimilarity(
  driverId: string | null,
  inputSignature: string
): Promise<SignatureSimilarity> {
  if (!driverId) {
    return {
      score: null,
      referenceSignatureId: null,
      comparedReferenceCount: 0,
    };
  }

  const driverSignaturesQ = query(
    collection(db, "signatures"),
    where("driverId", "==", driverId)
  );
  const driverSignaturesSnap = await getDocs(driverSignaturesQ);

  const references = driverSignaturesSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .filter((doc) => typeof doc.signatureBase64 === "string" && doc.signatureBase64.length > 0)
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

  if (references.length === 0) {
    return {
      score: null,
      referenceSignatureId: null,
      comparedReferenceCount: 0,
    };
  }

  const latest = references[0];
  const score = await compareSignatures(inputSignature, latest.signatureBase64);

  return {
    score,
    referenceSignatureId: latest.id,
    comparedReferenceCount: references.length,
  };
}

async function computePharmacyStaffSignatureSimilarity(
  pharmacyId: string | null | undefined,
  inputSignature: string
): Promise<SignatureSimilarity> {
  if (!pharmacyId) {
    return {
      score: null,
      referenceSignatureId: null,
      comparedReferenceCount: 0,
    };
  }

  const employeeSignaturesQ = query(
    collection(db, "signatures"),
    where("pharmacyId", "==", pharmacyId)
  );
  const employeeSignaturesSnap = await getDocs(employeeSignaturesQ);

  const references = employeeSignaturesSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .filter((doc) => typeof doc.signatureBase64 === "string" && doc.signatureBase64.length > 0);

  if (references.length === 0) {
    return {
      score: null,
      referenceSignatureId: null,
      comparedReferenceCount: 0,
    };
  }

  let bestScore: number | null = null;
  let bestId: string | null = null;

  for (const reference of references) {
    const score = await compareSignatures(inputSignature, reference.signatureBase64);
    if (score === null) continue;

    if (bestScore === null || score > bestScore) {
      bestScore = score;
      bestId = reference.id;
    }
  }

  return {
    score: bestScore,
    referenceSignatureId: bestId,
    comparedReferenceCount: references.length,
  };
}

async function recordDriverLocationPoint({
  driverId,
  driverName,
  pharmacyId,
  orderId,
  status,
  lat,
  lng,
}: {
  driverId: string;
  driverName: string;
  pharmacyId: string;
  orderId?: string;
  status: string;
  lat: number;
  lng: number;
}) {
  try {
    await tryRunOrEnqueue("recordDriverLocationPoint", {
      driverId,
      driverName,
      pharmacyId,
      orderId: orderId || null,
      status,
      lat,
      lng,
      capturedAtMs: Date.now(),
      capturedAt: serverTimestamp(),
      source: "DRIVER_DASHBOARD",
    });
  } catch (err) {
    console.warn("recordDriverLocationPoint error:", err);
  }
}

/* ---------- Signature Canvas ---------- */
function SignatureCanvas({
  label,
  onChange,
}: {
  label: string;
  onChange: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#fff";
    }
  }, []);

  const pos = (e: any) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (e.touches ? e.touches[0].clientX : e.clientX) - rect.left,
      y: (e.touches ? e.touches[0].clientY : e.clientY) - rect.top,
    };
  };

  const start = (e: any) => {
    if (e?.cancelable) e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e: any) => {
    if (e?.cancelable) e.preventDefault();
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = () => {
    drawing.current = false;
    onChange(canvasRef.current!.toDataURL("image/png"));
  };

  const clear = () => {
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.clearRect(0, 0, 320, 120);
    onChange("");
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-white/70">{label}</p>
      <canvas
        ref={canvasRef}
        width={320}
        height={120}
        className="border border-white/20 rounded bg-black touch-none"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <button
        type="button"
        onClick={clear}
        className="text-xs text-white/60 underline"
      >
        Clear
      </button>
    </div>
  );
}

/* ---------- Component ---------- */
export default function DriverDashboardPage() {
  const router = useRouter();

  const driverId =
    typeof window !== "undefined"
      ? localStorage.getItem("DRIVER_ID")
      : null;

  const driverName =
    typeof window !== "undefined"
      ? localStorage.getItem("DRIVER_NAME")
      : "UNKNOWN";

  const [pharmacyPin, setPharmacyPin] = useState("");
  const [addPharmacyError, setAddPharmacyError] = useState("");
  const [addPharmacyInfo, setAddPharmacyInfo] = useState("");
  const [connectedPharmacies, setConnectedPharmacies] = useState<Pharmacy[]>([]);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  // Unique active orders (remove duplicates by id)
  const uniqueActiveOrders = getUniqueActiveOrders(activeOrders);
  const [returnTasks, setReturnTasks] = useState<
    { orderId: string; customerName: string; pumps: string[] }[]
  >([]);

  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deliveryContextTimeISO, setDeliveryContextTimeISO] = useState("");

  const [driverSignature, setDriverSignature] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [customerSignatureMetrics, setCustomerSignatureMetrics] = useState<SignatureMetrics | null>(null);
  const [employeeSignature, setEmployeeSignature] = useState("");
  const [driverPickupSignature, setDriverPickupSignature] = useState("");
  const [pickupSimilarityPreview, setPickupSimilarityPreview] = useState<{
    loading: boolean;
    pharmacyStaffScore: number | null;
    driverScore: number | null;
    error: string;
  }>({
    loading: false,
    pharmacyStaffScore: null,
    driverScore: null,
    error: "",
  });
  const [deliverySimilarityPreview, setDeliverySimilarityPreview] = useState<{
    loading: boolean;
    driverScore: number | null;
    error: string;
  }>({
    loading: false,
    driverScore: null,
    error: "",
  });
  const [customerSignatureQuality, setCustomerSignatureQuality] = useState<{
    checking: boolean;
    valid: boolean | null;
    reason: string;
  }>({
    checking: false,
    valid: null,
    reason: "",
  });
  const [receiverName, setReceiverName] = useState("");
  const [previousPumpsStatus, setPreviousPumpsStatus] = useState<
    Record<string, { returned: boolean; reason: string }>
  >({});

  const [notifPermission, setNotifPermission] = useState<string>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [notifToken, setNotifToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setNotifPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    // initialize offline queue processing
    initOfflineQueue();
  }, []);

  const [loading, setLoading] = useState(false);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryError, setDeliveryError] = useState("");
  const [deliveryInfo, setDeliveryInfo] = useState("");
  const [acceptInfo, setAcceptInfo] = useState("");
  const [lastTechnicalError, setLastTechnicalError] = useState("");
  const [dashboardSection, setDashboardSection] = useState<
    "home" | "active" | "returns" | "connect"
  >("home");

  function registerTechnicalError(scope: string, err: unknown) {
    const code = (err as any)?.code ? String((err as any).code) : "UNKNOWN";
    const message = (err as any)?.message ? String((err as any).message) : "No message";
    setLastTechnicalError(`${scope}: ${code} — ${message}`);
  }

  const pendingReturnPumpCount = returnTasks.reduce(
    (count, task) => count + task.pumps.length,
    0
  );

  const hasPendingReturns = pendingReturnPumpCount > 0;

  useEffect(() => {
    (async () => {
      await ensureAnonymousAuth();
      if (driverId) loadConnectedPharmacies();
    })();
  }, []);

  useEffect(() => {
    if (!showDeliveryModal || !selectedOrder) return;

    const previous = selectedOrder.customerPreviousPumps || [];
    const initial: Record<string, { returned: boolean; reason: string }> = {};

    previous.forEach((num) => {
      initial[String(num)] = { returned: true, reason: "" };
    });

    setPreviousPumpsStatus(initial);
  }, [showDeliveryModal, selectedOrder]);

  useEffect(() => {
    let cancelled = false;

    const runPickupSimilarityPreview = async () => {
      if (!showPickupModal || !selectedOrder) {
        setPickupSimilarityPreview({
          loading: false,
          pharmacyStaffScore: null,
          driverScore: null,
          error: "",
        });
        return;
      }

      if (!employeeSignature || !driverPickupSignature) {
        setPickupSimilarityPreview({
          loading: false,
          pharmacyStaffScore: null,
          driverScore: null,
          error: "",
        });
        return;
      }

      setPickupSimilarityPreview((prev) => ({ ...prev, loading: true, error: "" }));

      try {
        const [pharmacyStaffSimilarity, pickupDriverSimilarity] = await Promise.all([
          computePharmacyStaffSignatureSimilarity(selectedOrder.pharmacyId, employeeSignature),
          computeDriverSignatureSimilarity(driverId, driverPickupSignature),
        ]);

        if (cancelled) return;

        setPickupSimilarityPreview({
          loading: false,
          pharmacyStaffScore: pharmacyStaffSimilarity.score,
          driverScore: pickupDriverSimilarity.score,
          error: "",
        });
      } catch (err) {
        if (cancelled) return;
        const message = (err as any)?.message ? String((err as any).message) : "Could not calculate similarity";
        setPickupSimilarityPreview({
          loading: false,
          pharmacyStaffScore: null,
          driverScore: null,
          error: message,
        });
      }
    };

    const timeout = setTimeout(runPickupSimilarityPreview, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [showPickupModal, selectedOrder, employeeSignature, driverPickupSignature, driverId]);

  useEffect(() => {
    let cancelled = false;

    const runDeliverySimilarityPreview = async () => {
      if (!showDeliveryModal || !selectedOrder) {
        setDeliverySimilarityPreview({ loading: false, driverScore: null, error: "" });
        return;
      }

      if (!driverSignature) {
        setDeliverySimilarityPreview({ loading: false, driverScore: null, error: "" });
        return;
      }

      setDeliverySimilarityPreview((prev) => ({ ...prev, loading: true, error: "" }));

      try {
        const result = await computeDriverSignatureSimilarity(driverId, driverSignature);
        if (cancelled) return;

        setDeliverySimilarityPreview({
          loading: false,
          driverScore: result.score,
          error: "",
        });
      } catch (err) {
        if (cancelled) return;
        const message = (err as any)?.message ? String((err as any).message) : "Could not calculate similarity";
        setDeliverySimilarityPreview({
          loading: false,
          driverScore: null,
          error: message,
        });
      }
    };

    const timeout = setTimeout(runDeliverySimilarityPreview, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [showDeliveryModal, selectedOrder, driverSignature, driverId]);

  useEffect(() => {
    let cancelled = false;

    const runCustomerSignatureValidation = async () => {
      if (!showDeliveryModal) {
        setCustomerSignatureQuality({ checking: false, valid: null, reason: "" });
        return;
      }

      if (!signature) {
        setCustomerSignatureQuality({ checking: false, valid: null, reason: "" });
        return;
      }

      setCustomerSignatureQuality((prev) => ({ ...prev, checking: true }));

      try {
        const metricsValidation = validateCustomerSignatureMetrics(customerSignatureMetrics);
        if (!metricsValidation.valid) {
          if (cancelled) return;
          setCustomerSignatureQuality({
            checking: false,
            valid: false,
            reason: metricsValidation.reason || "Customer signature is too simple.",
          });
          return;
        }

        const result = await validateCustomerSignatureQuality(signature);
        if (cancelled) return;

        setCustomerSignatureQuality({
          checking: false,
          valid: result.valid,
          reason: result.valid ? "" : (result.reason || "Customer signature is too simple."),
        });
      } catch {
        if (cancelled) return;
        setCustomerSignatureQuality({
          checking: false,
          valid: false,
          reason: "Customer signature validation failed. Please sign again.",
        });
      }
    };

    const timeout = setTimeout(runCustomerSignatureValidation, 200);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [showDeliveryModal, signature, customerSignatureMetrics]);

  async function loadConnectedPharmacies() {
    await ensureAnonymousAuth();

    const snap = await getDocs(
      collection(db, "drivers", driverId!, "pharmacies")
    );
    const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    setConnectedPharmacies(list);
    loadOrders(list);
  }

  // Subscribe to orders in real-time and log updates for debugging
  function loadOrders(pharmacies?: Pharmacy[]) {
    const pharmacyIds =
      pharmacies?.map((p) => p.pharmacyId) ||
      connectedPharmacies.map((p) => p.pharmacyId);

    // Listen to all orders and filter client-side (simpler and reliable)
    const unsub = onSnapshot(collection(db, "orders"), (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

      const available = all.filter(
        (o) => o.status === "PENDING" && pharmacyIds.includes(o.pharmacyId)
      );

      const active = all.filter(
        (o) =>
          o.driverId === driverId &&
          [
            "ASSIGNED",
            "IN_PROGRESS",
            "ON_WAY_TO_PHARMACY",
            "ON_WAY_TO_CUSTOMER",
          ].includes(o.status)
      );

      const tasks = all
        .filter((o) => o.driverId === driverId)
        .map((o) => {
          const pending = (o.previousPumpsReturnToPharmacy || [])
            .filter((entry) => !entry.returnedToPharmacy)
            .map((entry) => String(entry.pumpNumber));

          return {
            orderId: o.id,
            customerName: o.customerName,
            pumps: pending,
          };
        })
        .filter((entry) => entry.pumps.length > 0);

      setAvailableOrders(available);
      setActiveOrders(active);
      setReturnTasks(tasks);
    });

    return unsub;
  }

  // Ensure we re-subscribe if connected pharmacies change
  useEffect(() => {
    let unsub: any = null;
    if (connectedPharmacies.length > 0 && driverId) {
      unsub = loadOrders(connectedPharmacies);
    }

    return () => {
      if (unsub) unsub();
    };
  }, [connectedPharmacies, driverId]);

  useEffect(() => {
    if (!driverId || !driverName || activeOrders.length === 0) return;

    const intervalId = setInterval(async () => {
      const location = await getDriverCurrentLocation({
        timeoutMs: 2000,
        maximumAge: 15000,
      });

      if (!location) return;

      await Promise.all(
        activeOrders.map(async (order) => {
          await recordDriverLocationPoint({
            driverId,
            driverName,
            pharmacyId: order.pharmacyId,
            orderId: order.id,
            status: String(order.status || "ACTIVE"),
            lat: location.lat,
            lng: location.lng,
          });
        })
      );
    }, 15000);

    return () => clearInterval(intervalId);
  }, [activeOrders, driverId, driverName]);

  async function handleAddPharmacy() {
    await ensureAnonymousAuth();

    setAddPharmacyError("");
    setAddPharmacyInfo("");
    if (!driverId) {
      setAddPharmacyError("Driver ID missing — login required.");
      return;
    }

    if (!pharmacyPin || pharmacyPin.trim().length === 0) {
      setAddPharmacyError("Enter a valid PIN.");
      return;
    }

    setLoading(true);
    try {
      const q = query(
        collection(db, "pharmacies"),
        where("pin", "==", pharmacyPin),
        where("active", "==", true)
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        setAddPharmacyError("Invalid PIN or pharmacy not active.");
        return;
      }

      const p = snap.docs[0];

      // Check duplicate
      const dupQ = query(
        collection(db, "drivers", driverId!, "pharmacies"),
        where("pharmacyId", "==", p.id)
      );
      const dupSnap = await getDocs(dupQ);
      if (!dupSnap.empty) {
        setAddPharmacyInfo("Already connected to that pharmacy.");
        setPharmacyPin("");
        loadConnectedPharmacies();
        return;
      }

      await tryRunOrEnqueue("addDriverPharmacy", {
        driverId,
        data: {
          pharmacyId: p.id,
          ...(p.data() as any),
          connectedAtMs: Date.now(),
        },
      });

      setAddPharmacyInfo("Successfully connected to pharmacy.");
      setPharmacyPin("");
      loadConnectedPharmacies();
    } catch (err) {
      console.error("handleAddPharmacy error:", err);
      registerTechnicalError("CONNECT_PHARMACY", err);
      const code = (err as any)?.code ? ` (${String((err as any).code)})` : "";
      setAddPharmacyError(`Error connecting to pharmacy${code}.`);
    } finally {
      setLoading(false);
      setTimeout(() => {
        setAddPharmacyInfo("");
        setAddPharmacyError("");
      }, 6000);
    }
  }

  async function handleAcceptOrder(id: string) {
    await ensureAnonymousAuth();

    const liveLocation = await getDriverCurrentLocation();

    await execOrEnqueue(
      "updateOrder",
      { id, updates: {
        status: "ASSIGNED",
        driverId,
        driverName,
        assignedAtMs: Date.now(),
        statusUpdatedAtMs: Date.now(),
        ...(liveLocation
          ? {
              driverLatitude: liveLocation.lat,
              driverLongitude: liveLocation.lng,
            }
          : {}),
      } },
      () => updateDoc(doc(db, "orders", id), {
        status: "ASSIGNED",
        driverId,
        driverName,
        assignedAt: serverTimestamp(),
        statusUpdatedAt: serverTimestamp(),
        ...(liveLocation
          ? {
              driverLatitude: liveLocation.lat,
              driverLongitude: liveLocation.lng,
            }
          : {}),
      })
    );
    loadOrders();

    // Actualizar estado de bombas y registrar movimiento (PICKED_UP -> IN_TRANSIT)
    const order =
      availableOrders.find((o) => o.id === id) ||
      activeOrders.find((o) => o.id === id);

    if (order) {
      if (liveLocation && driverId && driverName) {
        await recordDriverLocationPoint({
          driverId,
          driverName,
          pharmacyId: order.pharmacyId,
          orderId: order.id,
          status: "ASSIGNED",
          lat: liveLocation.lat,
          lng: liveLocation.lng,
        });
      }

      if (order.returnReminderNote) {
        setAcceptInfo(order.returnReminderNote);
        setTimeout(() => setAcceptInfo(""), 7000);
      } else if (order.customerPreviousPumps && order.customerPreviousPumps.length > 0) {
        setAcceptInfo(
          `Reminder: this customer already has pumps ${order.customerPreviousPumps.join(", ")}. Please request them.`
        );
        setTimeout(() => setAcceptInfo(""), 7000);
      }

      for (const pumpNumber of order.pumpNumbers) {
        const q = query(
          collection(db, "pumps"),
          where("pumpNumber", "==", pumpNumber),
          where("pharmacyId", "==", order.pharmacyId)
        );

        const snap = await getDocs(q);

        if (!snap.empty) {
          const pumpDoc = snap.docs[0];

          await execOrEnqueue(
            "updatePump",
            { id: pumpDoc.id, updates: { status: "IN_TRANSIT" } },
            () => updateDoc(doc(db, "pumps", pumpDoc.id), { status: "IN_TRANSIT" })
          );

          await logPumpMovement({
            pumpId: pumpDoc.id,
            pumpNumber,
            pharmacyId: order.pharmacyId,
            orderId: order.id,
            action: "PICKED_UP",
            performedById: driverId!,
            performedByName: driverName!,
            role: "DRIVER",
          });
        }
      }
    }
  }

  async function handleOnWayToPharmacy(id: string) {
    await ensureAnonymousAuth();

    const liveLocation = await getDriverCurrentLocation();

    await execOrEnqueue(
      "updateOrder",
      { id, updates: {
        status: "ON_WAY_TO_PHARMACY",
        statusUpdatedAtMs: Date.now(),
        ...(liveLocation
          ? {
              driverLatitude: liveLocation.lat,
              driverLongitude: liveLocation.lng,
            }
          : {}),
      } },
      () => updateDoc(doc(db, "orders", id), {
        status: "ON_WAY_TO_PHARMACY",
        statusUpdatedAt: serverTimestamp(),
        ...(liveLocation
          ? {
              driverLatitude: liveLocation.lat,
              driverLongitude: liveLocation.lng,
            }
          : {}),
      })
    );

    const order = activeOrders.find((o) => o.id === id);
    if (liveLocation && order && driverId && driverName) {
      await recordDriverLocationPoint({
        driverId,
        driverName,
        pharmacyId: order.pharmacyId,
        orderId: order.id,
        status: "ON_WAY_TO_PHARMACY",
        lat: liveLocation.lat,
        lng: liveLocation.lng,
      });
    }

    loadOrders();
  }

  async function handleArrivedAtCustomer(order: Order) {
    await ensureAnonymousAuth();

    setSelectedOrder(order);
    setShowDeliveryModal(true);
    setDeliveryContextTimeISO(new Date().toISOString());

    const liveLocation = await getDriverCurrentLocation();
    const arrivedAtISO = new Date().toISOString();

    try {
      await execOrEnqueue(
        "updateOrder",
        { id: order.id, updates: {
          arrivedAtMs: Date.now(),
          arrivedAtISO,
          statusUpdatedAtMs: Date.now(),
          ...(liveLocation
            ? {
                driverLatitude: liveLocation.lat,
                driverLongitude: liveLocation.lng,
              }
            : {}),
        } },
        () => updateDoc(doc(db, "orders", order.id), {
          arrivedAt: serverTimestamp(),
          arrivedAtISO,
          statusUpdatedAt: serverTimestamp(),
          ...(liveLocation
            ? {
                driverLatitude: liveLocation.lat,
                driverLongitude: liveLocation.lng,
              }
            : {}),
        })
      );

      if (liveLocation && driverId && driverName) {
        await recordDriverLocationPoint({
          driverId,
          driverName,
          pharmacyId: order.pharmacyId,
          orderId: order.id,
          status: "ON_WAY_TO_CUSTOMER",
          lat: liveLocation.lat,
          lng: liveLocation.lng,
        });
      }

      setDeliveryInfo(
        `Arrival registered: ${formatDateTime(arrivedAtISO)}`
      );
      setTimeout(() => setDeliveryInfo(""), 6000);
    } catch (err) {
      console.warn("Failed to register arrival at customer:", err);
      registerTechnicalError("ARRIVED_AT_CUSTOMER", err);
    }
  }

  async function handleCompleteDelivery() {
    if (!selectedOrder) return;

    await ensureAnonymousAuth();

    const order = selectedOrder;

    setDeliveryError("");
    setDeliveryInfo("");

    if (!receiverName.trim()) {
      setDeliveryError("Employee name is required.");
      return;
    }

    if (!signature || !driverSignature) {
      setDeliveryError("Both customer and driver signatures are required.");
      return;
    }

    const customerSignatureQuality = await validateCustomerSignatureQuality(signature);
    if (!customerSignatureQuality.valid) {
      setDeliveryError(
        customerSignatureQuality.reason ||
          "Customer signature is not valid. Please sign again."
      );
      return;
    }

    const customerMetricsQuality = validateCustomerSignatureMetrics(customerSignatureMetrics);
    if (!customerMetricsQuality.valid) {
      setDeliveryError(
        customerMetricsQuality.reason ||
          "Customer signature is not valid. Please sign again."
      );
      return;
    }

    const previousPumpsList = selectedOrder.customerPreviousPumps || [];
    const previousPumpsStatusList = previousPumpsList.map((num) => {
      const key = String(num);
      const status = previousPumpsStatus[key];

      return {
        pumpNumber: key,
        returned: status?.returned ?? true,
        reason: (status?.reason || "").trim(),
      };
    });

    const notReturnedList = previousPumpsStatusList.filter(
      (entry) => !entry.returned
    );

    const previousPumpsReturnToPharmacy = previousPumpsStatusList
      .filter((entry) => entry.returned)
      .map((entry) => ({
        pumpNumber: entry.pumpNumber,
        returnedToPharmacy: false,
      }));

    if (previousPumpsStatusList.length > 0) {
      const missingReason = previousPumpsStatusList.find(
        (entry) => !entry.returned && !entry.reason
      );

      if (missingReason) {
        setDeliveryError("Please provide a reason for each pump not returned.");
        return;
      }
    }

    setDeliveryLoading(true);
    setShowDeliveryModal(false);
    setDeliveryInfo("Saving delivery...");
    let completed = false;

    try {
      const deliveryDriverSimilarity = await computeDriverSignatureSimilarity(driverId, driverSignature);
      const signatureSimilarityAudit = {
        mode: "observe_only",
        calculatedAtISO: new Date().toISOString(),
        driver: deliveryDriverSimilarity,
      };

      const locationPromise = getDriverCurrentLocation({
        timeoutMs: 1500,
        maximumAge: 30000,
      });
      const ipPromise = getClientIpWithTimeout(1200);

      const deliveredAtISO = new Date().toISOString();

      const [signatureUrl, driverSignatureUrl, signatureHash, driverSignatureHash] =
        await Promise.all([
          uploadSignatureToStorage(`${order.id}-customer`, signature),
          uploadSignatureToStorage(`${order.id}-driver`, driverSignature),
          generateSHA256Hash(signature),
          generateSHA256Hash(driverSignature),
        ]);

      const [location, ip] = await Promise.all([locationPromise, ipPromise]);

      if (location && driverId && driverName) {
        await recordDriverLocationPoint({
          driverId,
          driverName,
          pharmacyId: order.pharmacyId,
          orderId: order.id,
          status: "DELIVERED",
          lat: location.lat,
          lng: location.lng,
        });
      }

      const allReturned =
        previousPumpsStatusList.length > 0 &&
        previousPumpsStatusList.every((entry) => entry.returned);
      const previousPumpsReturned = previousPumpsStatusList.length === 0
        ? null
        : allReturned;

      const deliveryLocationData = location
        ? {
            deliveredLatitude: location.lat,
            deliveredLongitude: location.lng,
          }
        : {};

      const baseDeliveryData = {
        orderId: order.id,
        pharmacyId: order.pharmacyId,
        pharmacyName: order.pharmacyName,
        pumpNumbers: order.pumpNumbers,
        customerName: order.customerName,
        customerAddress: order.customerAddress,
        receivedByName: receiverName.trim(),
        previousPumps: previousPumpsList,
        previousPumpsReturned,
        previousPumpsStatus: previousPumpsStatusList,
        previousPumpsReturnToPharmacy,
        driverId,
        driverName,
        signatureUrl,
        signatureHash,
        driverSignatureUrl,
        driverSignatureHash,
        deliveredAtISO,
        deliveredFromIP: ip,
        ...deliveryLocationData,
      };

      let deliverySignatureRef: any = null;
      let skipPostProcessing = false;

      try {
        deliverySignatureRef = await execOrEnqueue(
          "addDeliverySignature",
          {
            ...baseDeliveryData,
            signature,
            driverSignature,
            signatureSimilarityAudit,
            deliveredAt: serverTimestamp(),
            legalPdfUrl: "",
          },
          () => addDoc(collection(db, "deliverySignatures"), {
            ...baseDeliveryData,
            signature,
            driverSignature,
            signatureSimilarityAudit,
            deliveredAt: serverTimestamp(),
            legalPdfUrl: "",
          })
        );

        await execOrEnqueue(
          "updateOrder",
          {
            id: order.id,
            updates: {
              ...baseDeliveryData,
              signatureSimilarityAudit,
              deliveredAt: serverTimestamp(),
              legalPdfUrl: "",
              status: "DELIVERED",
              statusUpdatedAt: serverTimestamp(),
            },
          },
          () => updateDoc(doc(db, "orders", order.id), {
            ...baseDeliveryData,
            signatureSimilarityAudit,
            deliveredAt: serverTimestamp(),
            legalPdfUrl: "",
            status: "DELIVERED",
            statusUpdatedAt: serverTimestamp(),
          })
        );

        completed = true;
        loadOrders();
      } catch (err) {
        // If we couldn't perform writes (likely offline), enqueue operations to sync later
        try {
          await tryRunOrEnqueue("addDeliverySignature", {
            ...baseDeliveryData,
            signature,
            driverSignature,
            signatureSimilarityAudit,
            deliveredAtMs: Date.now(),
            legalPdfUrl: "",
          });
          await tryRunOrEnqueue("updateOrder", {
            id: order.id,
            updates: {
              ...baseDeliveryData,
              signatureSimilarityAudit,
              deliveredAtMs: Date.now(),
              legalPdfUrl: "",
              status: "DELIVERED",
              statusUpdatedAtMs: Date.now(),
            },
          });
        } catch (e) {
          console.warn("Failed to enqueue delivery ops:", e);
        }

        completed = true;
        skipPostProcessing = true;
        loadOrders();
        setDeliveryInfo("Delivery saved locally and will sync when online.");
      }

      if (!skipPostProcessing) {
        (async () => {
        let legalPdfUrl = "";

        try {
          const employeeSignatureSource = await getPickupEmployeeSignature(order.id);

          const pdfBlob = await generateDeliveryPDF({
            orderId: order.id,
            customerName: order.customerName,
            driverName: driverName || "",
            pumpNumbers: order.pumpNumbers,
            eKitCodes: order.eKitCodes || [],
            deliveredAt: deliveredAtISO,
            ip,
            lat: location?.lat ?? 0,
            lng: location?.lng ?? 0,
            signatureUrl,
            driverSignatureUrl,
            employeeSignatureUrl: employeeSignatureSource || undefined,
          });

          const pdfRef = storageRef(storage, `delivery_pdfs/${order.id}.pdf`);
          await uploadBytes(pdfRef, pdfBlob, { contentType: "application/pdf" });
          legalPdfUrl = await getDownloadURL(pdfRef);

          await Promise.all([
            execOrEnqueue(
              "updateOrder",
              { id: order.id, updates: { legalPdfUrl } },
              () => updateDoc(doc(db, "orders", order.id), { legalPdfUrl })
            ),
            execOrEnqueue(
              "updateDeliverySignature",
              { id: deliverySignatureRef.id, updates: { legalPdfUrl } },
              () => updateDoc(doc(db, "deliverySignatures", deliverySignatureRef.id), { legalPdfUrl })
            ),
          ]);
        } catch (err) {
          console.error("Failed to generate or upload PDF:", err);
        }

        if (notReturnedList.length > 0 && order.customerId) {
          try {
            const customerSnap = await getDoc(doc(db, "customers", order.customerId));
            const customerEmail = customerSnap.data()?.email as string | undefined;

            if (customerEmail) {
              const sentAt = formatDateTime(new Date());
              const reasonsHtml = notReturnedList
                .map(
                  (entry) =>
                    `<li>Pump #${entry.pumpNumber}: ${entry.reason || "No reason provided"}</li>`
                )
                .join("");

              await sendAppEmail({
                to: customerEmail,
                subject: "Pumps Not Returned",
                html: `
                  <p>Hello ${order.customerName},</p>
                  <p>We did not receive the following pumps during the last delivery:</p>
                  <ul>${reasonsHtml}</ul>
                  <p><strong>Recorded:</strong> ${sentAt}</p>
                  <p>Please return these pumps on the next delivery.</p>
                `,
                text: `Pumps not returned: ${notReturnedList
                  .map((entry) => `${entry.pumpNumber} (${entry.reason || "No reason"})`)
                  .join(", ")}. Recorded: ${sentAt}. Please return these pumps on the next delivery.`,
              });
            }
          } catch (err) {
            console.warn("Customer email send failed:", err);
          }
        }

        await Promise.all(
          order.pumpNumbers.map(async (pumpNumber) => {
            const q = query(
              collection(db, "pumps"),
              where("pumpNumber", "==", pumpNumber),
              where("pharmacyId", "==", order.pharmacyId)
            );

            const snap = await getDocs(q);
            if (!snap.empty) {
              const pumpDoc = snap.docs[0];

              await execOrEnqueue(
                "updatePump",
                { id: pumpDoc.id, updates: { status: "DELIVERED" } },
                () => updateDoc(doc(db, "pumps", pumpDoc.id), { status: "DELIVERED" })
              );

              await logPumpMovement({
                pumpId: pumpDoc.id,
                pumpNumber,
                pharmacyId: order.pharmacyId,
                orderId: order.id,
                action: "DELIVERED",
                performedById: driverId!,
                performedByName: driverName!,
                role: "DRIVER",
              });
            }
          })
        );

      })();
      }
    } catch (err) {
      console.error("handleCompleteDelivery error:", err);
      registerTechnicalError("CONFIRM_DELIVERY", err);
      const code = (err as any)?.code ? ` (${String((err as any).code)})` : "";
      setShowDeliveryModal(true);
      setDeliveryInfo("");
      setDeliveryError(`Failed to confirm delivery${code}. Please try again.`);
    } finally {
      setDeliveryLoading(false);
    }

    if (completed) {
      setShowDeliveryModal(false);
      setSelectedOrder(null);
      setDeliveryContextTimeISO("");
      setSignature(null);
      setCustomerSignatureMetrics(null);
      setDriverSignature("");
      setReceiverName("");
      setPreviousPumpsStatus({});
      setDeliveryInfo(
        `Delivery registered successfully at ${formatDateTime(new Date())}.`
      );
      setTimeout(() => setDeliveryInfo(""), 6000);
    }
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white flex justify-center py-10 px-4">
      <div className="w-full max-w-5xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent">
            Driver Dashboard
          </h1>
          <p className="text-xs text-white/50 uppercase tracking-widest font-semibold">
            {driverName || "Driver"}
          </p>
        </div>

        <div className="flex justify-end mt-2">
          {driverId && (
            <div className="flex items-center gap-3">
              <NotificationBell userId={driverId} role="DRIVER" />
            </div>
          )}
        </div>

        {deliveryInfo && (
          <p className="text-green-400 text-sm text-center">
            {deliveryInfo}
          </p>
        )}

        {acceptInfo && (
          <p className="text-yellow-300 text-sm text-center">
            {acceptInfo}
          </p>
        )}

        {lastTechnicalError && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3">
            <p className="text-[11px] font-semibold text-rose-300 uppercase tracking-wider">
              Last technical error
            </p>
            <p className="text-xs text-rose-200/90 mt-1 break-all">{lastTechnicalError}</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <button
            type="button"
            onClick={() => setDashboardSection("home")}
            className={`py-2 rounded-lg text-xs font-semibold border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
              dashboardSection === "home"
                ? "bg-white/15 border-white/40"
                : "bg-black/30 border-white/10 hover:border-white/30"
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <LayoutDashboard size={14} />
              DASHBOARD
            </span>
          </button>
          
          {/* Test push removed per request */}
          <button
            type="button"
            onClick={() => setDashboardSection("active")}
            className={`py-2 rounded-lg text-xs font-semibold border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 ${
              dashboardSection === "active"
                ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-200"
                : "bg-black/30 border-white/10 hover:border-white/30"
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <Truck size={14} />
              ACTIVE
            </span>
          </button>
          <button
            type="button"
            onClick={() => setDashboardSection("returns")}
            className={`py-2 rounded-lg text-xs font-semibold border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/40 ${
              dashboardSection === "returns"
                ? "bg-amber-500/20 border-amber-400/50 text-amber-200"
                : hasPendingReturns
                ? "bg-red-500/20 border-red-400/50 text-red-200 hover:border-red-300/70"
                : "bg-black/30 border-white/10 hover:border-white/30"
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <RotateCcw size={14} />
              RETURNS
              {hasPendingReturns && (
                <span className="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-red-600 text-white text-[10px] px-1">
                  {pendingReturnPumpCount}
                </span>
              )}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setDashboardSection("connect")}
            className={`py-2 rounded-lg text-xs font-semibold border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/40 ${
              dashboardSection === "connect"
                ? "bg-indigo-500/20 border-indigo-400/50 text-indigo-200"
                : "bg-black/30 border-white/10 hover:border-white/30"
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <Link2 size={14} />
              CONNECT
            </span>
          </button>
          <button
            type="button"
            onClick={() => router.push("/driver/delivery-pdfs")}
            className="py-2 rounded-lg text-xs font-semibold border bg-cyan-600/30 border-cyan-500/40 hover:bg-cyan-600/40 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40"
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <FileText size={14} />
              PDFS
            </span>
          </button>
        </div>

        {hasPendingReturns && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3">
            <p className="text-sm font-semibold text-red-300 inline-flex items-center gap-2">
              <AlertTriangle size={16} />
              Warning: You have {pendingReturnPumpCount} pump{pendingReturnPumpCount !== 1 ? "s" : ""} pending return.
            </p>
            <p className="text-xs text-red-200/80 mt-1">
              Open the RETURNS section to see which pumps must be returned.
            </p>
          </div>
        )}

        {/* NEW ORDERS */}
        <div className="bg-gradient-to-br from-emerald-500/10 to-black/60 border border-emerald-500/30 rounded-2xl p-8 shadow-[0_0_40px_rgba(16,185,129,0.08)]">
          <div className="flex items-center justify-between mb-5 gap-3">
            <h2 className="text-2xl font-extrabold inline-flex items-center gap-2">
              <PackageOpen className="text-emerald-300" size={22} />
              New Orders
            </h2>
            <span className="text-xs px-3 py-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 text-emerald-200 font-semibold">
              {availableOrders.length} pending
            </span>
          </div>
          {availableOrders.length === 0 && (
            <p className="text-sm text-white/60">No new orders available.</p>
          )}
          {availableOrders.length > 0 && (
            <ul className="space-y-4">
              {availableOrders.map((o) => (
                <li
                  key={o.id}
                  className="border border-emerald-500/30 rounded-xl p-5 space-y-3 bg-emerald-500/5 transition-all duration-200 hover:border-emerald-400/50 hover:bg-emerald-500/10"
                >
                  <p className="font-semibold text-lg">{o.pharmacyName}</p>
                  <p className="text-sm text-white/90">{o.customerName}</p>

                  {o.customerCity && (
                    <p className="text-xs text-white/60">
                      📍 {o.customerCity}, {o.customerCountry}
                    </p>
                  )}

                  {o.customerAddress && (
                    <p className="text-xs text-white/50">
                      🏠 {o.customerAddress}
                    </p>
                  )}

                  <p className="text-xs text-white/70">
                    Pumps to carry: {o.pumpNumbers && o.pumpNumbers.length > 0 ? o.pumpNumbers.join(", ") : "—"}
                  </p>

                  <p className="text-xs text-violet-300">
                    E-KITs to carry: {o.eKitCodes && o.eKitCodes.length > 0 ? o.eKitCodes.join(", ") : "—"}
                  </p>

                  <button
                    onClick={() => handleAcceptOrder(o.id)}
                    className="w-full bg-green-600 hover:bg-green-500 py-3 rounded-lg font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-500/25 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300/40"
                  >
                    ACCEPT ORDER
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {dashboardSection === "active" && (
          <div className="bg-black/40 border border-green-500/30 rounded-xl p-6">
            <h2 className="font-semibold mb-4 text-green-300 inline-flex items-center gap-2">
              <Truck size={16} />
              My Active Orders
            </h2>
            {uniqueActiveOrders.length === 0 && (
              <p className="text-xs text-white/60">No active orders.</p>
            )}
            <ul className="space-y-3">
              {uniqueActiveOrders.map((o) => (
                <li
                  key={o.id}
                  className="border border-green-500/30 rounded p-4 space-y-2"
                >
                  <p className="font-semibold">{o.pharmacyName}</p>
                  <p>{o.customerName}</p>
                  <p className="text-xs text-white/70">
                    Pumps: {o.pumpNumbers && o.pumpNumbers.length > 0 ? o.pumpNumbers.join(", ") : "—"}
                  </p>
                  <p className="text-xs text-violet-300">
                    E-KITs: {o.eKitCodes && o.eKitCodes.length > 0 ? o.eKitCodes.join(", ") : "—"}
                  </p>

                  {o.status === "ASSIGNED" && (
                    <button
                      onClick={() => handleOnWayToPharmacy(o.id)}
                      className="w-full bg-yellow-600 py-2 rounded transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-yellow-500/20 active:scale-[0.99]"
                    >
                      ON THE WAY TO PHARMACY
                    </button>
                  )}

                  {o.status === "ON_WAY_TO_PHARMACY" && (
                    <button
                      onClick={() => {
                        setSelectedOrder(o);
                        setShowPickupModal(true);
                      }}
                      className="w-full bg-indigo-600 py-2 rounded transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.99]"
                    >
                      ARRIVED AT PHARMACY
                    </button>
                  )}

                  {o.status === "ON_WAY_TO_CUSTOMER" && (
                    <>
                      {o.arrivedAtISO && (
                        <p className="text-xs text-white/60">
                          Arrival: {formatDateTime(o.arrivedAtISO)}
                        </p>
                      )}
                      <button
                        onClick={() => handleArrivedAtCustomer(o)}
                        className="w-full bg-green-600 py-2 rounded transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-500/20 active:scale-[0.99]"
                      >
                        ARRIVED AT CUSTOMER
                      </button>
                    </>
                  )}

                  {o.customerPreviousPumps && o.customerPreviousPumps.length > 0 && (
                    <p className="text-xs text-yellow-300">
                      Pumps: {o.customerPreviousPumps.join(", ")}
                    </p>
                  )}

                  {o.returnReminderNote && (
                    <p className="text-xs text-yellow-300">
                      Reminder: {o.returnReminderNote}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {dashboardSection === "returns" && (
          <div className="bg-black/40 border border-amber-500/30 rounded-xl p-6">
            <h2 className="font-semibold mb-4 text-amber-300 inline-flex items-center gap-2">
              <RotateCcw size={16} />
              Return Tasks
            </h2>
            {returnTasks.length === 0 && (
              <p className="text-xs text-white/60">No pending returns.</p>
            )}
            {returnTasks.length > 0 && (
              <ul className="space-y-3">
                {returnTasks.map((task) => (
                  <li
                    key={`${task.orderId}-${task.customerName}`}
                    className="border border-amber-500/30 rounded p-4 space-y-1"
                  >
                    <p className="text-sm font-semibold">{task.customerName}</p>
                    <p className="text-xs text-white/60">
                      Pumps: {task.pumps.join(", ")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {dashboardSection === "connect" && (
          <div className="bg-black/40 border border-white/10 rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-indigo-300 inline-flex items-center gap-2">
              <Link2 size={16} />
              Connect Pharmacy
            </h2>
            <input
              value={pharmacyPin}
              onChange={(e) => setPharmacyPin(e.target.value)}
              placeholder="Enter 4-digit Pharmacy PIN"
              maxLength={4}
              className="w-full p-2 rounded bg-black border border-white/10"
            />
            <button
              onClick={handleAddPharmacy}
              disabled={loading}
              className="w-full bg-indigo-600 py-2 rounded transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.99] disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              CONNECT PHARMACY
            </button>
            {addPharmacyError && (
              <p className="text-red-400 text-sm">{addPharmacyError}</p>
            )}
            {addPharmacyInfo && (
              <p className="text-green-400 text-sm">{addPharmacyInfo}</p>
            )}

            {connectedPharmacies.length > 0 && (
              <div className="mt-2">
                <ul className="text-sm space-y-1">
                  {connectedPharmacies.map((p) => (
                    <li key={p.id} className="flex justify-between">
                      <span>{p.pharmacyName || p.pharmacyId}</span>
                      <span className="text-xs text-white/50">{p.city || ""}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* PICKUP MODAL */}
        {showPickupModal && selectedOrder && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center">
            <div className="bg-[#020617] p-6 rounded-xl space-y-4 w-full max-w-md">
              <p className="font-semibold">
                Pharmacy: {selectedOrder.pharmacyName}
              </p>
              <p>Pumps: {selectedOrder.pumpNumbers.join(", ")}</p>
              <p>E-KITs: {selectedOrder.eKitCodes && selectedOrder.eKitCodes.length > 0 ? selectedOrder.eKitCodes.join(", ") : "—"}</p>
              <p>Address: {selectedOrder.customerAddress}</p>

              <SignatureCanvas
                label="Pharmacy Staff Signature"
                onChange={setEmployeeSignature}
              />
              <SignatureCanvas
                label="Driver Signature"
                onChange={setDriverPickupSignature}
              />

              <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs space-y-1">
                <p className="text-violet-300 font-semibold">Signature Similarity Preview (observe only)</p>
                {pickupSimilarityPreview.loading ? (
                  <p className="text-white/60">Calculating...</p>
                ) : (
                  <>
                    <p className="text-white/70">
                      Pharmacy Staff: {formatSimilarityPercent(pickupSimilarityPreview.pharmacyStaffScore)}
                    </p>
                    <p className="text-white/70">
                      Driver: {formatSimilarityPercent(pickupSimilarityPreview.driverScore)}
                    </p>
                  </>
                )}
                {pickupSimilarityPreview.error && (
                  <p className="text-red-300">{pickupSimilarityPreview.error}</p>
                )}
              </div>

              <button
                disabled={!employeeSignature || !driverPickupSignature}
                onClick={async () => {
                  // 🔑 CLOSE UI FIRST (CRITICAL)
                  setShowPickupModal(false);
                  setEmployeeSignature("");
                  setDriverPickupSignature("");

                  try {
                    await ensureAnonymousAuth();
                    const liveLocation = await getDriverCurrentLocation();

                    const [pharmacyStaffSimilarity, pickupDriverSimilarity] = await Promise.all([
                      computePharmacyStaffSignatureSimilarity(selectedOrder.pharmacyId, employeeSignature),
                      computeDriverSignatureSimilarity(driverId, driverPickupSignature),
                    ]);

                    const signatureSimilarityAudit = {
                      mode: "observe_only",
                      calculatedAtISO: new Date().toISOString(),
                      pharmacyStaff: pharmacyStaffSimilarity,
                      driver: pickupDriverSimilarity,
                    };

                    await tryRunOrEnqueue("addPickupSignature", {
                      orderId: selectedOrder.id,
                      pharmacyId: selectedOrder.pharmacyId,
                      signature: employeeSignature,
                      employeeName: selectedOrder.pharmacyName || "PHARMACY_STAFF",
                      driverName: driverName || "UNKNOWN",
                      employeeSignature,
                      driverSignature: driverPickupSignature,
                      signatureSimilarityAudit,
                      createdAtMs: Date.now(),
                    });

                    await execOrEnqueue(
                      "updateOrder",
                      {
                        id: selectedOrder.id,
                        updates: {
                          pickupSignatureSimilarityAudit: signatureSimilarityAudit,
                          status: "ON_WAY_TO_CUSTOMER",
                          statusUpdatedAtMs: Date.now(),
                          ...(liveLocation
                            ? {
                                driverLatitude: liveLocation.lat,
                                driverLongitude: liveLocation.lng,
                              }
                            : {}),
                        },
                      },
                      () => updateDoc(
                        doc(db, "orders", selectedOrder.id),
                        {
                          pickupSignatureSimilarityAudit: signatureSimilarityAudit,
                          status: "ON_WAY_TO_CUSTOMER",
                          statusUpdatedAt: serverTimestamp(),
                          ...(liveLocation
                            ? {
                                driverLatitude: liveLocation.lat,
                                driverLongitude: liveLocation.lng,
                              }
                            : {}),
                        }
                      )
                    );

                    if (liveLocation && driverId && driverName) {
                      await recordDriverLocationPoint({
                        driverId,
                        driverName,
                        pharmacyId: selectedOrder.pharmacyId,
                        orderId: selectedOrder.id,
                        status: "ON_WAY_TO_CUSTOMER",
                        lat: liveLocation.lat,
                        lng: liveLocation.lng,
                      });
                    }

                    loadOrders();
                  } catch (err) {
                    console.error("Pickup failed:", err);
                    registerTechnicalError("CONFIRM_PICKUP", err);
                    const code = (err as any)?.code ? ` (${String((err as any).code)})` : "";
                    alert(`Error confirming pickup${code}.`);
                  }
                }}
                className="w-full bg-green-600 py-2 rounded disabled:opacity-50"
              >
                ON THE WAY TO DELIVER
              </button>
            </div>
          </div>
        )}

        {/* DELIVERY MODAL */}
        {showDeliveryModal && selectedOrder && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center px-4">
            <div className="bg-[#020617] p-6 rounded-xl space-y-4 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <p className="font-semibold">
                Customer: {selectedOrder.customerName}
              </p>

              <div className="rounded-lg border border-white/10 bg-black/30 p-3 space-y-1">
                <p className="text-xs text-white/80">
                  Driver delivering: <span className="font-semibold text-white">{driverName || "UNKNOWN"}</span>
                </p>
                <p className="text-xs text-white/80">
                  Pumps to deliver: <span className="font-semibold text-white">{selectedOrder.pumpNumbers.join(", ")}</span>
                </p>
                <p className="text-xs text-white/80">
                  E-KITs to deliver: <span className="font-semibold text-violet-200">{selectedOrder.eKitCodes && selectedOrder.eKitCodes.length > 0 ? selectedOrder.eKitCodes.join(", ") : "—"}</span>
                </p>
                <p className="text-xs text-white/80">
                  Delivery date/time: <span className="font-semibold text-white">{formatDateTime(deliveryContextTimeISO || new Date().toISOString())}</span>
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-white/70">Receiver Name</label>
                <input
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  placeholder="Name of the person receiving"
                  className="w-full p-2 rounded bg-black border border-white/10"
                />
              </div>

              <DeliverySignature
                title="Customer Signature"
                mode="auto"
                onMetrics={setCustomerSignatureMetrics}
                onSave={(dataUrl) => {
                  setSignature(dataUrl);
                }}
              />
              <DeliverySignature
                title="Driver Signature"
                mode="auto"
                onSave={(dataUrl) => setDriverSignature(dataUrl)}
              />

              <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs space-y-1">
                <p className="text-violet-300 font-semibold">Signature Similarity Preview (observe only)</p>
                {deliverySimilarityPreview.loading ? (
                  <p className="text-white/60">Calculating...</p>
                ) : (
                  <p className="text-white/70">
                    Driver: {formatSimilarityPercent(deliverySimilarityPreview.driverScore)}
                  </p>
                )}
                {deliverySimilarityPreview.error && (
                  <p className="text-red-300">{deliverySimilarityPreview.error}</p>
                )}
              </div>

              {selectedOrder.customerPreviousPumps &&
                selectedOrder.customerPreviousPumps.length > 0 && (
                  <div className="bg-black/30 border border-white/10 rounded-lg p-4 space-y-3">
                    <p className="text-sm font-semibold">Previous Pumps To Return</p>
                    <div className="space-y-3">
                      {selectedOrder.customerPreviousPumps.map((num) => {
                        const key = String(num);
                        const status = previousPumpsStatus[key] || {
                          returned: true,
                          reason: "",
                        };

                        return (
                          <div
                            key={key}
                            className="border border-white/10 rounded p-3 space-y-2"
                          >
                            <label className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={status.returned}
                                onChange={(e) =>
                                  setPreviousPumpsStatus((prev) => ({
                                    ...prev,
                                    [key]: {
                                      returned: e.target.checked,
                                      reason: e.target.checked
                                        ? ""
                                        : prev[key]?.reason || "",
                                    },
                                  }))
                                }
                              />
                              Customer returned pump #{key}
                              {!status.returned && (
                                <span className="ml-2 rounded bg-red-500/20 text-red-300 px-2 py-0.5 text-[10px]">
                                  Not returned
                                </span>
                              )}
                            </label>

                            {!status.returned && (
                              <textarea
                                value={status.reason}
                                onChange={(e) =>
                                  setPreviousPumpsStatus((prev) => ({
                                    ...prev,
                                    [key]: {
                                      returned: false,
                                      reason: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="Reason for not returning this pump"
                                className="w-full p-2 rounded bg-black border border-white/10 text-xs"
                                rows={3}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              {deliveryError && (
                <p className="text-red-400 text-sm">{deliveryError}</p>
              )}

              {customerSignatureQuality.checking && (
                <p className="text-yellow-300 text-sm">Validating customer signature quality...</p>
              )}

              {customerSignatureQuality.valid === false && customerSignatureQuality.reason && (
                <p className="text-red-400 text-sm">{customerSignatureQuality.reason}</p>
              )}

              <button
                onClick={handleCompleteDelivery}
                disabled={
                  deliveryLoading ||
                  !signature ||
                  !driverSignature ||
                  customerSignatureQuality.checking ||
                  customerSignatureQuality.valid === false
                }
                className="w-full bg-green-600 py-2 rounded disabled:opacity-50"
              >
                {deliveryLoading ? "SAVING..." : "CONFIRM DELIVERY"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// Filtrar órdenes activas para evitar duplicados por order.id
export function getUniqueActiveOrders(activeOrders: Order[]): Order[] {
  return Array.from(new Map(activeOrders.map((o) => [o.id, o])).values());
}
