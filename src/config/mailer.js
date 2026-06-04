import nodemailer from "nodemailer";
import { env } from "./env.js";

let transporter = null;

const isMailConfigured = () =>
  Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.CONSULTATION_NOTIFY_TO);

export const getMailTransporter = () => {
  if (!isMailConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }
  return transporter;
};

export const sendConsultationNotification = async ({ consultation, requestMeta }) => {
  const transport = getMailTransporter();
  if (!transport) {
    return { sent: false, reason: "mail_not_configured" };
  }

  const preferredDateLabel = consultation.preferredDate
    ? new Date(consultation.preferredDate).toISOString().slice(0, 10)
    : "—";

  const html = `
    <h2>New consultation request</h2>
    <p><strong>Source:</strong> ${consultation.source || "website-2"}</p>
    <p><strong>Name:</strong> ${consultation.fullName}</p>
    <p><strong>Email:</strong> ${consultation.email}</p>
    <p><strong>Phone:</strong> ${consultation.phone || "—"}</p>
    <p><strong>Preferred date:</strong> ${preferredDateLabel}</p>
    <p><strong>Preferred time:</strong> ${consultation.preferredTime}</p>
    <p><strong>Message:</strong></p>
    <pre>${consultation.message}</pre>
    <hr />
    <p><small>IP: ${requestMeta?.ip || "—"} | Referer: ${requestMeta?.referer || "—"}</small></p>
  `;

  await transport.sendMail({
    from: env.SMTP_FROM || env.SMTP_USER,
    to: env.CONSULTATION_NOTIFY_TO,
    replyTo: consultation.email,
    subject: `[Consultation] ${consultation.fullName} — ${preferredDateLabel} ${consultation.preferredTime}`,
    html,
    text: [
      `New consultation from ${consultation.fullName}`,
      `Email: ${consultation.email}`,
      `Phone: ${consultation.phone || "—"}`,
      `Date: ${preferredDateLabel}`,
      `Time: ${consultation.preferredTime}`,
      `Message: ${consultation.message}`,
    ].join("\n"),
  });

  return { sent: true };
};
