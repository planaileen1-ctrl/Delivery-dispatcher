export async function sendLicenseEmail(to: string, code: string) {
  try {
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to, code }),
    });

    const text = await res.text();
    let data: any = null;

    try {
      data = JSON.parse(text);
    } catch {
      // Si no es JSON, no reventamos
      console.warn("⚠️ Response was not JSON:", text);
    }

    // Caso ideal
    if (res.ok && data?.success) {
      return {
        success: true,
        delivered: true,
      };
    }

    // Caso dudoso: backend respondió pero no confirmó
    return {
      success: true,
      delivered: false,
      warning: data?.error || "Email could not be confirmed",
    };
  } catch (err) {
    console.error("❌ sendLicenseEmail error:", err);

    // NUNCA lanzamos error
    return {
      success: true,
      delivered: false,
      warning: "Email request failed",
    };
  }
}
