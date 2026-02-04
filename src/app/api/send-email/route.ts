import { NextResponse } from 'next/server';
// @ts-ignore
import nodemailer from 'nodemailer';

/**
 * Servidor de envío de correos (API Route)
 * Ubicación: src/app/api/send-email/route.ts
 * Recuerda configurar EMAIL_USER y EMAIL_PASS en Vercel
 */

export async function POST(request: Request) {
  try {
    const { to, subject, html } = await request.json();

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return NextResponse.json({ success: false, error: 'Email config missing' }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Dispatcher Pro" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Email Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}