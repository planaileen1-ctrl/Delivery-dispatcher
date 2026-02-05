import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { to, code } = await req.json();

    if (!to || !code) {
      return NextResponse.json(
        { error: "Missing email or license code" },
        { status: 400 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to,
      subject: "Your Dispatcher Pro License",
      html: `
        <h2>Dispatcher Pro</h2>
        <p>Your license code:</p>
        <strong>${code}</strong>
      `,
    });

    if (error) {
      console.error("❌ RESEND ERROR:", error);
      return NextResponse.json({ error }, { status: 500 });
    }

    console.log("✅ EMAIL SENT VIA RESEND");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ SEND EMAIL ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
