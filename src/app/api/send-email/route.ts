import { NextResponse } from 'next/server';
// @ts-ignore
import nodemailer from 'nodemailer';

/**
 * Handle Email sending via Nodemailer
 * Path: src/app/api/send-email/route.ts
 * Configura EMAIL_USER y EMAIL_PASS en Vercel (.env)
 */

export async function POST(request: Request) {
  try {
    const { to, subject, html } = await request.json();

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Email configuration missing');
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
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

    return NextResponse.json({ success: true, message: 'Email sent successfully' });
  } catch (error: any) {
    console.error('Email Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}