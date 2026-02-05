export async function sendLicenseEmail(to: string, code: string) {
  const res = await fetch("/api/send-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to, code }),
  });

  const text = await res.text(); // 👈 SIEMPRE leer como texto primero
  let data: any;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Server did not return JSON: " + text);
  }

  if (!res.ok || !data.success) {
    throw new Error(data.error || "Email failed");
  }

  return data;
}
