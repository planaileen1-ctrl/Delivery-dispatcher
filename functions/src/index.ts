import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as nodemailer from "nodemailer";
import cors from "cors";

const GMAIL_PASS = defineSecret("GMAIL_PASS");
const corsHandler = cors({ origin: true });

export const sendEmail = onRequest(
  {
    region: "us-central1",
    secrets: [GMAIL_PASS],
  },
  (req, res) => {
    corsHandler(req, res, async () => {
      if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
      }

      const { to, subject, html, text } = req.body;

      if (!to || !subject || (!html && !text)) {
        res.status(400).json({ error: "Missing fields" });
        return;
      }

      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: "notificationsglobal@gmail.com",
            pass: GMAIL_PASS.value(),
          },
        });

        await transporter.sendMail({
          from: `"Delivery Dispatcher" <notificationsglobal@gmail.com>`,
          to,
          subject,
          html,
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
    });
  }
);
