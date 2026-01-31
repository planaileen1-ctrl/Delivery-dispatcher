import { onRequest } from "firebase-functions/v2/https";
import * as nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "notificationsglobal@gmail.com",
    pass: process.env.MAIL_PASS!,
  },
});

export const sendEmail = onRequest(
  {
    region: "us-central1",
    cpu: 1,
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const { to, subject, text } = req.body;

    if (!to || !subject || !text) {
      res.status(400).json({ error: "Missing fields" });
      return;
    }

    try {
      await transporter.sendMail({
        from: `"Notifications Global" <notificationsglobal@gmail.com>`,
        to,
        subject,
        text,
      });

      console.log("✅ Email sent to:", to);
      res.json({ success: true });
    } catch (err: any) {
      console.error("❌ Email error:", err);
      res.status(500).json({
        error: "Email failed",
        details: err.message,
      });
    }
  }
);
