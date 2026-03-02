"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, getDoc, getDocs, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { db, ensureAnonymousAuth, storage } from "@/lib/firebase";
import { sendAppEmail } from "@/lib/emailClient";
import AdminModeBadge from "@/components/AdminModeBadge";
import { generateDeliveryPDF } from "@/lib/generateDeliveryPDF";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { buildDeliveryReportEmailHtml } from "@/lib/deliveryReportTemplate";

const DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
};

type DeliveryBackup = {
  id: string;
  customerName?: string;
  driverName?: string;
  receivedByName?: string;
  createdByEmployeeName?: string;
  pumpNumbers?: string[];
  eKitCodes?: string[];
  deliveredAt?: any;
  deliveredAtISO?: string;
  statusUpdatedAt?: any;
  createdAt?: any;
  legalPdfUrl?: string;
  status?: string;
  deliveredFromIP?: string;
  deliveredLatitude?: number;
  deliveredLongitude?: number;
  signatureUrl?: string;
  driverSignatureUrl?: string;
};

function formatDate(ts: any) {
  if (!ts) return "—";
  if (typeof ts === "string") return new Date(ts).toLocaleString("en-US", DATE_TIME_FORMAT);
  if (ts?.toDate) return ts.toDate().toLocaleString("en-US", DATE_TIME_FORMAT);
  return "—";
}

export default function EmployeeDeliveryPdfsPage() {
  const router = useRouter();

  const isPharmacyAdmin =
    typeof window !== "undefined"
      ? localStorage.getItem("EMPLOYEE_ROLE") === "PHARMACY_ADMIN"
      : false;

  const pharmacyId =
    typeof window !== "undefined"
      ? localStorage.getItem("PHARMACY_ID")
      : null;

  const [deliveryBackups, setDeliveryBackups] = useState<DeliveryBackup[]>([]);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [pdfEmailByOrder, setPdfEmailByOrder] = useState<Record<string, string>>({});
  const [pdfSendingByOrder, setPdfSendingByOrder] = useState<Record<string, boolean>>({});
  const [pdfOpeningByOrder, setPdfOpeningByOrder] = useState<Record<string, boolean>>({});
  const [selectedCustomerName, setSelectedCustomerName] = useState("");

  const toMillis = (ts: any) => {
    if (!ts) return 0;
    if (typeof ts === "string") return new Date(ts).getTime();
    if (ts?.toDate) return ts.toDate().getTime();
    if (typeof ts?.seconds === "number") return ts.seconds * 1000;
    return 0;
  };

  const toISO = (ts: any) => {
    const ms = toMillis(ts);
    if (ms > 0) return new Date(ms).toISOString();
    return new Date().toISOString();
  };

  async function isValidPdfUrl(url: string) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) return false;
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length < 5) return false;
      return (
        bytes[0] === 0x25 && // %
        bytes[1] === 0x50 && // P
        bytes[2] === 0x44 && // D
        bytes[3] === 0x46 && // F
        bytes[4] === 0x2d // -
      );
    } catch {
      return false;
    }
  }

  async function regeneratePdfForOrder(orderId: string) {
    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) {
      throw new Error("Order not found.");
    }

    const orderData = orderSnap.data() as any;

    const deliveryQ = query(
      collection(db, "deliverySignatures"),
      where("orderId", "==", orderId)
    );
    const deliverySnap = await getDocs(deliveryQ);
    const latestDeliverySignature = deliverySnap.docs
      .map((d) => d.data() as any)
      .sort(
        (a, b) =>
          toMillis(b.deliveredAt || b.createdAt || b.deliveredAtISO) -
          toMillis(a.deliveredAt || a.createdAt || a.deliveredAtISO)
      )[0];

    const pickupQ = query(
      collection(db, "pickupSignatures"),
      where("orderId", "==", orderId)
    );
    const pickupSnap = await getDocs(pickupQ);
    const latestPickup = pickupSnap.docs
      .map((d) => d.data() as any)
      .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))[0];

    const readStorageSignatureUrl = async (path: string) => {
      try {
        return await getDownloadURL(storageRef(storage, path));
      } catch {
        return "";
      }
    };

    const [customerStorageSignatureUrl, driverStorageSignatureUrl] = await Promise.all([
      readStorageSignatureUrl(`signatures/${orderId}-customer.png`),
      readStorageSignatureUrl(`signatures/${orderId}-driver.png`),
    ]);

    const resolveSignatureSource = async (rawValue: string) => {
      const value = String(rawValue || "").trim();
      if (!value) return "";
      if (value.startsWith("data:")) return value;
      if (value.startsWith("http://") || value.startsWith("https://")) return value;

      try {
        if (value.startsWith("gs://")) {
          return await getDownloadURL(storageRef(storage, value));
        }

        if (value.startsWith("signatures/") || value.startsWith("delivery_pdfs/") || value.startsWith("pickup_signatures/")) {
          return await getDownloadURL(storageRef(storage, value));
        }
      } catch {
        return "";
      }

      return value;
    };

    const customerSignatureRaw =
      String(orderData.signatureUrl || "").trim() ||
      String(latestDeliverySignature?.signatureUrl || "").trim() ||
      String(latestDeliverySignature?.signature || "").trim() ||
      String(latestDeliverySignature?.customerSignature || "").trim() ||
      String(latestDeliverySignature?.customerSignatureUrl || "").trim() ||
      customerStorageSignatureUrl;

    const driverSignatureRaw =
      String(orderData.driverSignatureUrl || "").trim() ||
      String(latestDeliverySignature?.driverSignatureUrl || "").trim() ||
      String(latestDeliverySignature?.driverSignature || "").trim() ||
      String(latestDeliverySignature?.deliveryDriverSignature || "").trim() ||
      String(latestDeliverySignature?.deliveryDriverSignatureUrl || "").trim() ||
      driverStorageSignatureUrl;

    const [customerSignatureSource, driverSignatureSource] = await Promise.all([
      resolveSignatureSource(customerSignatureRaw),
      resolveSignatureSource(driverSignatureRaw),
    ]);

    const pdfBlob = await generateDeliveryPDF({
      orderId,
      customerName: String(orderData.customerName || "Customer"),
      driverName: String(orderData.driverName || "UNKNOWN"),
      pumpNumbers: Array.isArray(orderData.pumpNumbers)
        ? orderData.pumpNumbers.map((value: any) => String(value))
        : [],
      eKitCodes: Array.isArray(orderData.eKitCodes)
        ? orderData.eKitCodes.map((value: any) => String(value))
        : [],
      deliveredAt: toISO(orderData.deliveredAt || orderData.deliveredAtISO || orderData.statusUpdatedAt || orderData.createdAt),
      ip: String(orderData.deliveredFromIP || ""),
      lat: typeof orderData.deliveredLatitude === "number" ? orderData.deliveredLatitude : 0,
      lng: typeof orderData.deliveredLongitude === "number" ? orderData.deliveredLongitude : 0,
      signatureUrl: customerSignatureSource,
      driverSignatureUrl: driverSignatureSource,
      employeeSignatureUrl: String(latestPickup?.employeeSignature || latestPickup?.signature || "") || undefined,
    });

    const pdfRef = storageRef(storage, `delivery_pdfs/${orderId}.pdf`);
    await uploadBytes(pdfRef, pdfBlob, { contentType: "application/pdf" });
    const legalPdfUrl = await getDownloadURL(pdfRef);

    await updateDoc(orderRef, { legalPdfUrl });
    return legalPdfUrl;
  }

  async function handleOpenPdf(backup: DeliveryBackup) {
    if (!backup.legalPdfUrl) {
      setError("PDF is not available yet.");
      return;
    }

    setError("");
    setPdfOpeningByOrder((prev) => ({ ...prev, [backup.id]: true }));

    try {
      setInfo("Regenerating PDF with visual signatures...");
      const regeneratedUrl = await regeneratePdfForOrder(backup.id);
      setInfo("PDF regenerated successfully.");
      window.open(regeneratedUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => setInfo(""), 5000);
    } catch (err) {
      console.error("Failed to open/regenerate PDF:", err);
      const valid = await isValidPdfUrl(backup.legalPdfUrl);
      if (valid) {
        window.open(backup.legalPdfUrl, "_blank", "noopener,noreferrer");
        setError("");
      } else {
        setError("Failed to regenerate PDF. Please try again.");
      }
    } finally {
      setPdfOpeningByOrder((prev) => ({ ...prev, [backup.id]: false }));
    }
  }

  useEffect(() => {
    let unsub: null | (() => void) = null;

    (async () => {
      await ensureAnonymousAuth();
      if (!pharmacyId) return;

      const q = query(
        collection(db, "orders"),
        where("pharmacyId", "==", pharmacyId)
      );

      unsub = onSnapshot(q, (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter(
            (o) =>
              !!o.legalPdfUrl &&
              (o.status === "DELIVERED" || o.deliveredAt || o.deliveredAtISO)
          )
          .sort((a, b) => {
            const toMs = (ts: any) => {
              if (!ts) return 0;
              if (typeof ts === "string") return new Date(ts).getTime();
              if (ts?.toDate) return ts.toDate().getTime();
              return 0;
            };

            return (
              toMs(b.deliveredAt || b.deliveredAtISO || b.statusUpdatedAt || b.createdAt) -
              toMs(a.deliveredAt || a.deliveredAtISO || a.statusUpdatedAt || a.createdAt)
            );
          })
          .slice(0, 20);

        setDeliveryBackups(list);
      });
    })();

    return () => {
      if (unsub) unsub();
    };
  }, [pharmacyId]);

  useEffect(() => {
    if (deliveryBackups.length === 0) {
      setSelectedCustomerName("");
      return;
    }

    const names = Array.from(
      new Set(deliveryBackups.map((item) => String(item.customerName || "Customer")))
    );

    if (selectedCustomerName && !names.includes(selectedCustomerName)) {
      setSelectedCustomerName(names[0]);
    }
  }, [deliveryBackups, selectedCustomerName]);

  const customerList = Array.from(
    new Set(deliveryBackups.map((item) => String(item.customerName || "Customer")))
  );

  const selectedCustomerBackups = deliveryBackups.filter(
    (item) => String(item.customerName || "Customer") === selectedCustomerName
  );

  async function handleSharePdfByEmail(backup: DeliveryBackup) {
    if (!backup.legalPdfUrl) {
      setError("PDF is not available yet.");
      return;
    }

    const normalizedTo = (pdfEmailByOrder[backup.id] || "").trim();
    if (!normalizedTo) {
      setError("Please enter recipient email first.");
      return;
    }

    if (!normalizedTo.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    setPdfSendingByOrder((prev) => ({ ...prev, [backup.id]: true }));

    try {
      await sendAppEmail({
        to: normalizedTo,
        subject: `Delivery PDF - Order ${backup.id}`,
        html: buildDeliveryReportEmailHtml({
          orderId: backup.id,
          customerName: backup.customerName,
          driverName: backup.driverName,
          pumpNumbers: backup.pumpNumbers,
          eKitCodes: backup.eKitCodes,
          deliveredAt: backup.deliveredAt || backup.deliveredAtISO || backup.statusUpdatedAt || backup.createdAt,
          ip: backup.deliveredFromIP,
          lat: backup.deliveredLatitude,
          lng: backup.deliveredLongitude,
          statusLabel: "Delivery Completed",
          pdfUrl: backup.legalPdfUrl,
          customerSignatureUrl: backup.signatureUrl,
          driverSignatureUrl: backup.driverSignatureUrl,
        }),
        text: `Delivery PDF backup for order ${backup.id}: ${backup.legalPdfUrl}`,
      });

      setInfo(`PDF shared by email to ${normalizedTo}.`);
      setPdfEmailByOrder((prev) => ({ ...prev, [backup.id]: "" }));
      setTimeout(() => setInfo(""), 6000);
    } finally {
      setPdfSendingByOrder((prev) => ({ ...prev, [backup.id]: false }));
    }
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white flex justify-center py-10 px-4">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Delivery PDF Backups</h1>
          <p className="text-sm text-white/60">
            View and share legal delivery PDF records
          </p>
          <AdminModeBadge />
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        {info && <p className="text-green-400 text-sm text-center">{info}</p>}

        <div className="bg-black/40 border border-cyan-500/30 rounded-xl p-6">
          {deliveryBackups.length === 0 && (
            <p className="text-xs text-white/60">No delivery PDFs available yet.</p>
          )}
          {deliveryBackups.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <aside className="border border-cyan-500/20 rounded p-3 h-fit">
                <p className="text-xs text-white/60 mb-2">Customers</p>
                <div className="space-y-2 max-h-[480px] overflow-auto pr-1">
                  {customerList.map((name) => {
                    const count = deliveryBackups.filter(
                      (item) => String(item.customerName || "Customer") === name
                    ).length;
                    const active = selectedCustomerName === name;

                    return (
                      <button
                        key={`customer-${name}`}
                        type="button"
                        onClick={() =>
                          setSelectedCustomerName((prev) => (prev === name ? "" : name))
                        }
                        className={`w-full text-left rounded px-3 py-2 border text-xs ${
                          active
                            ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-200"
                            : "border-white/10 text-white/70 hover:border-white/30"
                        }`}
                      >
                        <span className="font-semibold block">{name}</span>
                        <span className="text-[11px] text-white/50">Records: {count}</span>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <section className="lg:col-span-2 space-y-3">
                <p className="text-xs text-white/60">
                  Selected customer: <span className="text-emerald-300">{selectedCustomerName || "—"}</span>
                </p>

                {!selectedCustomerName && (
                  <p className="text-xs text-white/50">Press a customer on the left to show records.</p>
                )}

                {selectedCustomerBackups.length === 0 && (
                  <p className="text-xs text-white/50">
                    {selectedCustomerName ? "No records for this customer." : ""}
                  </p>
                )}

                {selectedCustomerBackups.map((o) => (
                  <div
                    key={`backup-${o.id}`}
                    className="border border-cyan-500/20 rounded p-4 space-y-1"
                  >
                    <p className="text-sm font-semibold">{o.customerName || "Customer"}</p>
                    <p className="text-xs text-white/60">
                      Driver: <span className="text-emerald-300">{o.driverName || "Unassigned"}</span>
                    </p>
                    <p className="text-xs text-white/60">
                      Received by: <span className="text-emerald-300">{o.receivedByName || "Not recorded"}</span>
                    </p>
                    <p className="text-xs text-white/60">
                      Created by: <span className="text-emerald-300">{o.createdByEmployeeName || "—"}</span>
                    </p>
                    <p className="text-xs text-white/60">
                      Pumps delivered: <span className="text-emerald-300">{o.pumpNumbers && o.pumpNumbers.length > 0 ? o.pumpNumbers.join(", ") : "—"}</span>
                    </p>
                    <p className="text-xs text-white/60">
                      E-KITs delivered: <span className="text-emerald-300">{o.eKitCodes && o.eKitCodes.length > 0 ? o.eKitCodes.join(", ") : "—"}</span>
                    </p>
                    <p className="text-xs text-white/50">
                      Delivered: {formatDate(o.deliveredAt || o.deliveredAtISO || o.statusUpdatedAt || o.createdAt)}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleOpenPdf(o)}
                      disabled={pdfOpeningByOrder[o.id] === true}
                      className="inline-block text-xs px-3 py-2 rounded bg-cyan-600 hover:bg-cyan-500"
                    >
                      {pdfOpeningByOrder[o.id] ? "OPENING..." : "VIEW PDF"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSharePdfByEmail(o)}
                      disabled={pdfSendingByOrder[o.id] === true}
                      className="ml-2 text-xs px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60"
                    >
                      {pdfSendingByOrder[o.id] ? "SENDING..." : "SHARE BY EMAIL"}
                    </button>
                    <input
                      type="email"
                      value={pdfEmailByOrder[o.id] || ""}
                      onChange={(e) =>
                        setPdfEmailByOrder((prev) => ({ ...prev, [o.id]: e.target.value }))
                      }
                      placeholder="recipient@email.com"
                      className="mt-2 w-full p-2 rounded bg-black border border-white/10 text-xs"
                    />
                  </div>
                ))}
              </section>
            </div>
          )}
        </div>

        <div className="text-center">
          <button
            onClick={() =>
              router.push(
                isPharmacyAdmin
                  ? "/pharmacy/dashboard"
                  : "/employee/dashboard"
              )
            }
            className="text-xs text-white/50 hover:text-white"
          >
            {isPharmacyAdmin ? "← Back to Pharmacy Dashboard" : "← Back to Employee Dashboard"}
          </button>
        </div>
      </div>
    </main>
  );
}
