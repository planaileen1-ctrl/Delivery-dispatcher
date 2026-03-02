import { jsPDF } from "jspdf";

export async function generateDeliveryPDF(data: {
  orderId: string
  customerName: string
  driverName: string
  pumpNumbers: string[]
  eKitCodes?: string[]
  deliveredAt: string
  ip: string
  lat: number
  lng: number
  signatureUrl: string
  driverSignatureUrl: string
  employeeSignatureUrl?: string
  statusLabel?: string
}) {
  const createValidFallbackPdf = () => {
    const escapePdfText = (value: string) =>
      value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

    const lines = [
      `Order ID: ${data.orderId}`,
      `Customer: ${data.customerName}`,
      `Driver: ${data.driverName}`,
      `Delivered At: ${data.deliveredAt}`,
    ];

    const textLines = lines
      .map((line, index) => `BT /F1 12 Tf 40 ${760 - index * 18} Td (${escapePdfText(line)}) Tj ET`)
      .join("\n");

    const objects = [
      "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
      "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
      "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
      `5 0 obj\n<< /Length ${textLines.length} >>\nstream\n${textLines}\nendstream\nendobj\n`,
    ];

    let pdf = "%PDF-1.4\n";
    const offsets: number[] = [0];

    for (const obj of objects) {
      offsets.push(pdf.length);
      pdf += obj;
    }

    const xrefStart = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";
    for (let i = 1; i <= objects.length; i++) {
      pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }

    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    return new Blob([pdf], { type: "application/pdf" });
  };

  let doc: jsPDF;
  try {
    doc = new jsPDF();
  } catch (err) {
    console.warn("Failed to initialize jsPDF, using fallback PDF:", err);
    return createValidFallbackPdf();
  }

  const safeText = (value: string) => String(value || "").replace(/[\r\n]+/g, " ").trim();
  const deliveredLabel = new Date(data.deliveredAt).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const pumpsLabel = data.pumpNumbers.length > 0 ? data.pumpNumbers.join(", ") : "—";
  const ekitsLabel = data.eKitCodes && data.eKitCodes.length > 0 ? data.eKitCodes.join(", ") : "—";

  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, 210, 297, "F");

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(12, 12, 186, 273, 4, 4, "FD");

  doc.setFillColor(37, 99, 235);
  doc.roundedRect(20, 20, 8, 8, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("N", 23, 25.8, { align: "center" });

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("NEXUS LOGISTICS", 31, 24.8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("Delivery Management System v2.4", 20, 31.8);

  doc.setFillColor(220, 252, 231);
  doc.setDrawColor(134, 239, 172);
  doc.roundedRect(148, 20, 42, 8, 4, 4, "FD");
  doc.setTextColor(22, 163, 74);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(data.statusLabel || "Delivery Completed", 169, 25.3, { align: "center" });

  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Order ID:", 190, 31.5, { align: "right" });
  doc.setTextColor(37, 99, 235);
  doc.setFont("courier", "bold");
  doc.text(safeText(data.orderId), 190, 36, { align: "right" });

  doc.setDrawColor(226, 232, 240);
  doc.line(20, 40, 190, 40);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("DELIVERY DETAILS", 20, 49);
  doc.text("EQUIPMENT INFO", 102, 49);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("CUSTOMER", 20, 58);
  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(safeText(data.customerName || "—"), 20, 63);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("DRIVER", 20, 72);
  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(safeText(data.driverName || "—"), 20, 77);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("DELIVERY DATE & TIME", 20, 86);
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(safeText(deliveredLabel), 20, 91);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(102, 56, 88, 22, 2, 2, "FD");
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text("PUMPS", 106, 62);
  doc.text("E-KITS", 136, 62);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(15, 23, 42);
  doc.text(safeText(pumpsLabel), 106, 70);
  doc.text(safeText(ekitsLabel), 136, 70);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("RECORDED LOCATION", 102, 86);
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(9.5);
  doc.text(`${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}`, 102, 91);
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.2);
  doc.text(`IP ADDRESS: ${safeText(data.ip || "—")}`, 102, 96);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("SIGNATURE RECORDS", 105, 109, { align: "center" });

  try {
    const toDataUrl = async (source?: string): Promise<string | null> => {
      if (!source) return null;
      const trimmed = String(source).trim();
      if (!trimmed) return null;

      if (trimmed.startsWith("data:image")) {
        return trimmed;
      }

      const looksLikeRawBase64 =
        trimmed.length > 120 &&
        !trimmed.includes("/") &&
        !trimmed.includes(":") &&
        /^[A-Za-z0-9+/=\r\n]+$/.test(trimmed);

      if (looksLikeRawBase64) {
        return `data:image/png;base64,${trimmed.replace(/\s+/g, "")}`;
      }

      try {
        const response = await fetch(trimmed);
        if (!response.ok) return null;
        const blob = await response.blob();

        return await new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = typeof reader.result === "string" ? reader.result : null;
            resolve(result);
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      } catch {
        return null;
      }
    };

    const normalizeSignatureDataUrl = async (dataUrl: string): Promise<string> => {
      return await new Promise<string>((resolve) => {
        try {
          const image = new Image();
          image.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve(dataUrl);
              return;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(image, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;

            for (let index = 0; index < pixels.length; index += 4) {
              const alpha = pixels[index + 3];
              if (alpha > 16) {
                pixels[index] = 51;
                pixels[index + 1] = 65;
                pixels[index + 2] = 85;
                pixels[index + 3] = Math.max(alpha, 210);
              }
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL("image/png"));
          };

          image.onerror = () => resolve(dataUrl);
          image.src = dataUrl;
        } catch {
          resolve(dataUrl);
        }
      });
    };

    const detectImageFormat = (value: string): "PNG" | "JPEG" => {
      if (value.startsWith("data:image/jpeg") || value.startsWith("data:image/jpg")) {
        return "JPEG";
      }
      return "PNG";
    };

    const rawImg1 = await toDataUrl(data.signatureUrl);
    const rawImg2 = await toDataUrl(data.driverSignatureUrl);
    const rawImg3 = await toDataUrl(data.employeeSignatureUrl);

    const img1 = rawImg1 ? await normalizeSignatureDataUrl(rawImg1) : null;
    const img2 = rawImg2 ? await normalizeSignatureDataUrl(rawImg2) : null;
    const img3 = rawImg3 ? await normalizeSignatureDataUrl(rawImg3) : null;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(20, 121, 54, 30, 2, 2, "FD");
    doc.roundedRect(78, 121, 54, 30, 2, 2, "FD");
    doc.roundedRect(136, 121, 54, 30, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("Customer Signature", 47, 116, { align: "center" });
    doc.text("Driver Signature", 105, 116, { align: "center" });
    doc.text("Pharmacy Staff", 163, 116, { align: "center" });

    if (img1) {
      doc.addImage(img1, detectImageFormat(img1), 22, 124, 50, 24);
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Not available", 47, 136, { align: "center" });
    }

    if (img2) {
      doc.addImage(img2, detectImageFormat(img2), 80, 124, 50, 24);
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Not available", 105, 136, { align: "center" });
    }

    if (img3) {
      doc.addImage(img3, detectImageFormat(img3), 138, 124, 50, 24);
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Not available", 163, 136, { align: "center" });
    }
  } catch (err) {
    // If images cannot be loaded into PDF, continue without them
    console.warn("Failed to add images to PDF:", err);
  }

  doc.setDrawColor(226, 232, 240);
  doc.line(20, 161, 190, 161);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("THIS DOCUMENT IS AN AUTOMATICALLY GENERATED DIGITAL REPRESENTATION.", 105, 168, { align: "center" });
  doc.text("NEXUS LOGISTICS · SECURE DELIVERY CERTIFICATION", 105, 172, { align: "center" });

  const blob = doc.output("blob");
  return blob;
}
