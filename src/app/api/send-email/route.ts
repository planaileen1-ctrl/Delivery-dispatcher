import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { to, code } = await req.json();

    if (!to || !code) {
      return NextResponse.json(
        { success: false, error: "Missing 'to' or 'code'" },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { success: false, error: "Email service not configured" },
        { status: 500 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const { error } = await resend.emails.send({
      from: "Dispatcher Pro <notifications@nexuslogistics.site>",
      to: [to],
      subject: "Your Dispatcher Pro License",
      html: `
        <h2>Dispatcher Pro</h2>
        <p>Your license code:</p>
        <h3>${code}</h3>
        <p>Thank you for your purchase.</p>
      `,
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
