type DeliveryReportEmailData = {
  orderId: string;
  customerName?: string;
  driverName?: string;
  pumpNumbers?: string[];
  eKitCodes?: string[];
  deliveredAt?: any;
  ip?: string;
  lat?: number;
  lng?: number;
  statusLabel?: string;
  pdfUrl: string;
  customerSignatureUrl?: string;
  driverSignatureUrl?: string;
  employeeSignatureUrl?: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeDate(value: any) {
  if (!value) return "—";
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? value
      : parsed.toLocaleString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        });
  }
  if (typeof value?.toDate === "function") {
    return value.toDate().toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }
  return "—";
}

function renderSignatureBox(title: string, url?: string) {
  if (url && (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:"))) {
    return `
      <div style="width:100%;height:110px;border:1px dashed #cbd5e1;border-radius:8px;background:#fcfcfc;display:flex;align-items:center;justify-content:center;overflow:hidden;">
        <img src="${escapeHtml(url)}" alt="${escapeHtml(title)}" style="max-width:100%;max-height:100%;object-fit:contain;background:#f8fafc;" />
      </div>
    `;
  }

  return `
    <div style="width:100%;height:110px;border:1px dashed #cbd5e1;border-radius:8px;background:#fcfcfc;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-style:italic;font-size:12px;">
      Not available
    </div>
  `;
}

export function buildDeliveryReportEmailHtml(data: DeliveryReportEmailData) {
  const pumps = data.pumpNumbers && data.pumpNumbers.length > 0 ? data.pumpNumbers.join(", ") : "—";
  const ekits = data.eKitCodes && data.eKitCodes.length > 0 ? data.eKitCodes.join(", ") : "—";
  const deliveredAt = normalizeDate(data.deliveredAt);
  const status = data.statusLabel || "Delivery Completed";
  const locationLabel =
    typeof data.lat === "number" && typeof data.lng === "number"
      ? `${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}`
      : "—";
  const mapsLink =
    typeof data.lat === "number" && typeof data.lng === "number"
      ? `https://www.google.com/maps?q=${data.lat},${data.lng}`
      : "";

  return `
  <div style="font-family:Inter,Arial,sans-serif;background:#f1f5f9;padding:24px;">
    <div style="max-width:860px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:24px;">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border-bottom:1px solid #e2e8f0;padding-bottom:18px;">
        <div>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:34px;height:34px;border-radius:6px;background:#2563eb;color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;">N</div>
            <div style="font-size:28px;font-weight:700;color:#0f172a;line-height:1;">NEXUS LOGISTICS</div>
          </div>
          <div style="font-size:12px;color:#64748b;margin-top:8px;">Delivery Management System v2.4</div>
        </div>
        <div style="text-align:right;">
          <span style="display:inline-block;background:#dcfce7;color:#15803d;padding:6px 12px;border-radius:999px;font-size:12px;font-weight:600;">${escapeHtml(status)}</span>
          <div style="font-size:12px;color:#64748b;margin-top:8px;">Order ID:</div>
          <div style="font-family:monospace;font-size:13px;font-weight:700;color:#2563eb;">${escapeHtml(data.orderId)}</div>
        </div>
      </div>

      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:18px;">
        <div style="flex:1;min-width:280px;">
          <div style="font-size:11px;letter-spacing:.08em;color:#94a3b8;font-weight:700;margin-bottom:8px;">DELIVERY DETAILS</div>
          <div style="font-size:12px;color:#64748b;">CUSTOMER</div>
          <div style="font-weight:600;color:#0f172a;margin-bottom:8px;">${escapeHtml(data.customerName || "—")}</div>
          <div style="font-size:12px;color:#64748b;">DRIVER</div>
          <div style="font-weight:600;color:#0f172a;margin-bottom:8px;">${escapeHtml(data.driverName || "—")}</div>
          <div style="font-size:12px;color:#64748b;">DELIVERY DATE & TIME</div>
          <div style="font-weight:600;color:#0f172a;">${escapeHtml(deliveredAt)}</div>
        </div>

        <div style="flex:1;min-width:280px;">
          <div style="font-size:11px;letter-spacing:.08em;color:#94a3b8;font-weight:700;margin-bottom:8px;">EQUIPMENT INFO</div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;display:flex;gap:16px;">
            <div>
              <div style="font-size:11px;color:#64748b;">PUMPS</div>
              <div style="font-size:24px;font-weight:700;color:#0f172a;">${escapeHtml(pumps)}</div>
            </div>
            <div>
              <div style="font-size:11px;color:#64748b;">E-KITS</div>
              <div style="font-size:24px;font-weight:700;color:#0f172a;">${escapeHtml(ekits)}</div>
            </div>
          </div>
          <div style="margin-top:10px;">
            <div style="font-size:11px;color:#64748b;">RECORDED LOCATION</div>
            ${mapsLink ? `<a href="${escapeHtml(mapsLink)}" target="_blank" rel="noreferrer" style="font-size:13px;color:#2563eb;text-decoration:none;">${escapeHtml(locationLabel)}</a>` : `<div style="font-size:13px;color:#64748b;">—</div>`}
            <div style="font-size:10px;color:#94a3b8;margin-top:4px;">IP ADDRESS: ${escapeHtml(data.ip || "—")}</div>
          </div>
        </div>
      </div>

      <div style="margin-top:24px;">
        <div style="font-size:11px;letter-spacing:.08em;color:#94a3b8;font-weight:700;margin-bottom:8px;text-align:center;">SIGNATURE RECORDS</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <div style="flex:1;min-width:220px;">
            <div style="font-size:12px;font-weight:600;color:#475569;text-align:center;margin-bottom:6px;">Customer Signature</div>
            ${renderSignatureBox("Customer Signature", data.customerSignatureUrl)}
          </div>
          <div style="flex:1;min-width:220px;">
            <div style="font-size:12px;font-weight:600;color:#475569;text-align:center;margin-bottom:6px;">Driver Signature</div>
            ${renderSignatureBox("Driver Signature", data.driverSignatureUrl)}
          </div>
          <div style="flex:1;min-width:220px;">
            <div style="font-size:12px;font-weight:600;color:#475569;text-align:center;margin-bottom:6px;">Pharmacy Staff</div>
            ${renderSignatureBox("Pharmacy Staff", data.employeeSignatureUrl)}
          </div>
        </div>
      </div>

      <div style="margin-top:22px;border-top:1px solid #e2e8f0;padding-top:14px;text-align:center;color:#94a3b8;font-size:10px;letter-spacing:.08em;">
        THIS DOCUMENT IS AN AUTOMATICALLY GENERATED DIGITAL REPRESENTATION.<br />
        NEXUS LOGISTICS · SECURE DELIVERY CERTIFICATION
      </div>

      <div style="margin-top:16px;text-align:center;">
        <a href="${escapeHtml(data.pdfUrl)}" target="_blank" rel="noreferrer" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 14px;border-radius:8px;font-size:12px;font-weight:600;">Open Delivery PDF</a>
      </div>
    </div>
  </div>
  `;
}
