"use client";

import { useState } from "react";
import { sendLicenseEmail } from "@/lib/sendEmail";

export default function GenerateLicense() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);

    try {
      // EJEMPLO: código generado
      const licenseCode = "TEST-9999";

      // 👉 enviar correo
      await sendLicenseEmail(email, licenseCode);

      alert("License created and email sent ✅");
    } catch (err: any) {
      console.error(err);
      alert("License created, but email failed ❌");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <input
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="email"
      />

      <button onClick={handleGenerate} disabled={loading}>
        {loading ? "Sending..." : "Generate License"}
      </button>
    </div>
  );
}
