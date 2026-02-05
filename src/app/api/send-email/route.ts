import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { to, subject, html } = await req.json();

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: "Missing fields" },
        { status: 400 }
      );
    }

    console.log("📨 SEND EMAIL ENDPOINT HIT");
    console.log("➡️ TO:", to);
    console.log("📧 USER:", process.env.EMAIL_USER);
    console.log("🔐 PASS EXISTS:", !!process.env.EMAIL_PASS);
    console.log("⏳ SENDING...");

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },

      // 🔥 ESTO SOLUCIONA EL ERROR
      tls: {
        rejectUnauthorized: false,
      },
    });

    await transporter.sendMail({
      from: `"Dispatcher Pro" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log("✅ EMAIL SENT");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ EMAIL ERROR FULL:", error);
    return NextResponse.json(
      { error: error.message || "Email failed" },
      { status: 500 }
    );
  }
}
