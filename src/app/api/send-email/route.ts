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
        <div style="font-family: Arial, sans-serif; padding:20px">
          <h2>Dispatcher Pro</h2>

          <p>Your pharmacy license has been created successfully.</p>

          <p><strong>License Code:</strong></p>
          <div style="font-size:18px;font-weight:bold;margin:12px 0">
            ${code}
          </div>

          <p>Next steps:</p>
          <ol>
            <li>Go to the Dispatcher Pro portal</li>
            <li>Select <strong>Create Account</strong></li>
            <li>Enter this license code</li>
          </ol>

          <p>If you have any questions, contact support.</p>

          <hr />
          <small>Dispatcher Pro • Industrial Grade Logistics</small>
        </div>
      `,
    });

    if (error) {
      console.error("❌ RESEND ERROR:", error);
      return NextResponse.json(
        { error: "Email failed" },
        { status: 500 }
      );
    }

    console.log("✅ EMAIL SENT VIA RESEND");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ SEND EMAIL ERROR:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
