import nodemailer from "nodemailer";

/**
 * Uses Nodemailer's JSON transport locally so account flows remain testable
 * without credentials or an external email dependency.
 */
export function createEmailService({
  origin = process.env.APP_ORIGIN ?? "http://localhost:5178",
  logger = console,
} = {}) {
  const transport = nodemailer.createTransport({ jsonTransport: true });

  /** Sends a verification or reset link and logs a safe local preview URL. */
  async function sendLink({ recipient, displayName, token, type }) {
    const route = type === "verify" ? "verify-email" : "reset-password";
    const action =
      type === "verify" ? "verify your email" : "reset your password";
    const url = `${origin}/?view=${route}&token=${encodeURIComponent(token)}`;
    const info = await transport.sendMail({
      from: "Edge Kings <no-reply@edge-kings.local>",
      to: recipient,
      subject: `Edge Kings: ${action}`,
      text: `Hello ${displayName},\n\nOpen this link to ${action}:\n${url}\n`,
    });

    logger.info(`[email preview] ${recipient}: ${url}`);
    return { messageId: info.messageId, previewUrl: url };
  }

  return { sendLink };
}
