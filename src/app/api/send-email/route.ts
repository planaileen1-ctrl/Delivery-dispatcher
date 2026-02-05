import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    console.log("🔥 ROUTE.TS NUEVO EJECUTADO");

    const body = await req.json();
    const { to, code } = body;

    if (!to || !code) {
      return NextResponse.json(
        { success: false, error: "Missing 'to' or 'code'" },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      console.error("❌ RESEND_API_KEY missing");
      return NextResponse.json(
        { success: false, error: "Email service not configured" },
        { status: 500 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const from =
      process.env.RESEND_FROM_EMAIL ??
      "Dispatcher Pro <onboarding@resend.dev>";

    console.log("📨 Sending email to:", to);

    const { error } = await resend.emails.send({
      from,
      to,
      subject: "Your Dispatcher Pro License",
      html: `
        <h2>Dispatcher Pro</h2>
        <p>Your license code:</p>
        <h3>${code}</h3>
        <p>Thank you for your purchase.</p>
      `,
    });

    if (error) {
      console.error("❌ RESEND ERROR:", error);
      return NextResponse.json(
        { success: false, error: "Email delivery failed" },
        { status: 500 }
      );
    }

    console.log("✅ EMAIL SENT TO:", to);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ SEND EMAIL ERROR:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
