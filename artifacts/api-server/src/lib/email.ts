import nodemailer from "nodemailer";
import { logger } from "./logger.js";

// ─── Brevo Email Client ──────────────────────────────────────────────────────

const rawApiKey = process.env.BREVO_API_KEY;
const BREVO_API_KEY = rawApiKey?.trim().replace(/^["']|["']$/g, "");
const FROM = process.env.SMTP_FROM ?? "Clariva <noreply@clariva.com>";

interface Sender {
  name: string;
  email: string;
}

/**
 * Parse an email sender string of format "Name <email@domain.com>" or just "email@domain.com".
 */
function parseSender(fromStr: string): Sender {
  const match = fromStr.match(/^(.*?)\s*<(.*?)>$/);
  if (match) {
    return {
      name: match[1].trim(),
      email: match[2].trim(),
    };
  }
  return {
    name: "Clariva",
    email: fromStr.trim(),
  };
}

const sender = parseSender(FROM);

// Allow overriding the HTTP API sender email and reply-to via env vars.
// Fall back to the parsed `FROM` values when not provided.
const HTTP_SENDER_EMAIL = process.env.SMTP_FROM_EMAIL ?? sender.email;
const REPLY_TO_EMAIL = process.env.SMTP_REPLY_TO ?? "tajamalkhan720@gmail.com";
// ─── Transport Mode Detection ────────────────────────────────────────────────

let smtpTransporter: nodemailer.Transporter | null = null;
let useHttpApi = false;

if (BREVO_API_KEY) {
  const len = BREVO_API_KEY.length;
  const prefix = BREVO_API_KEY.slice(0, 8);
  const hasAsterisks = BREVO_API_KEY.includes("*");

  logger.info(
    { length: len, prefix, hasAsterisks },
    "Diagnosing BREVO_API_KEY configuration...",
  );

  if (hasAsterisks) {
    logger.error(
      "BREVO_API_KEY contains asterisks ('*'). You likely copied a masked key from the Brevo dashboard. Please generate a NEW API Key and copy it immediately before closing the dialog.",
    );
  }

  if (BREVO_API_KEY.startsWith("xkeysib-")) {
    useHttpApi = true;
    logger.info(
      "Brevo v3 API Key detected. Using HTTP API for email delivery.",
    );
  } else {
    // If it starts with xsmtpsib- or is any other string, fallback to SMTP using the key as password.
    logger.info(
      { user: sender.email },
      `Brevo SMTP Key or custom key detected (${prefix}...). Initializing Nodemailer SMTP relay.`,
    );
    smtpTransporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: {
        user: sender.email,
        pass: BREVO_API_KEY,
      },
    });
  }
} else {
  logger.warn(
    "BREVO_API_KEY is not configured. Emails will be logged to the console.",
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InvitationEmailPayload {
  /** Recipient email address */
  toEmail: string;
  /** Display name of the person who sent the invitation */
  inviterName: string;
  /** Name of the team the recipient is being invited to */
  teamName: string;
  /** Deep-link that opens the app and pre-selects the correct tab */
  inviteLink: string;
  /** Whether the recipient already has an account */
  isNewUser: boolean;
}

export interface VerificationEmailPayload {
  /** Recipient email address */
  toEmail: string;
  /** User's name */
  userName: string;
  /** Verification link with token */
  verificationLink: string;
}

export interface PasswordResetEmailPayload {
  /** Recipient email address */
  toEmail: string;
  /** User's name */
  userName: string;
  /** Password reset link with token */
  resetLink: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildInvitationHtml(payload: InvitationEmailPayload): string {
  const { inviterName, teamName, inviteLink, isNewUser } = payload;
  const actionLabel = isNewUser
    ? "Create Account &amp; Join Team"
    : "Accept Invitation";
  const introText = isNewUser
    ? `<strong>${inviterName}</strong> has invited you to join the team <strong>"${teamName}"</strong> on Clariva. Since you don't have an account yet, click below to create one and automatically join the team.`
    : `<strong>${inviterName}</strong> has invited you to join the team <strong>"${teamName}"</strong> on Clariva. Click below to accept the invitation.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Team Invitation - Clariva</title>
</head>
<body style="margin:0;padding:0;background:#0D0C22;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0C22;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#13122b;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a3e 0%,#0D0C22 100%);padding:32px 40px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#57dffe;border-radius:10px;padding:8px 10px;vertical-align:middle;text-align:center;line-height:1;">
                    <span style="font-size:20px;color:#0D0C22;font-weight:bold;line-height:1;">✦</span>
                  </td>
                  <td style="padding-left:12px;vertical-align:middle;">
                    <span style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px;">Clariva</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 16px;color:#fff;font-size:24px;font-weight:700;line-height:1.3;">
                You've been invited to a team
              </h1>
              <p style="margin:0 0 28px;color:#94a3b8;font-size:15px;line-height:1.6;">
                ${introText}
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#57dffe;border-radius:10px;">
                    <a href="${inviteLink}"
                       style="display:inline-block;padding:14px 32px;color:#0D0C22;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.2px;">
                      ${actionLabel}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:28px 0 0;color:#64748b;font-size:13px;line-height:1.5;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;background:rgba(255,255,255,0.02);border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="margin:0;color:#64748b;font-size:12px;">
                © ${new Date().getFullYear()} Clariva. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildVerificationHtml(payload: VerificationEmailPayload): string {
  const { userName, verificationLink } = payload;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify Your Email - Clariva</title>
</head>
<body style="margin:0;padding:0;background:#0D0C22;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0C22;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#13122b;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a3e 0%,#0D0C22 100%);padding:32px 40px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#57dffe;border-radius:10px;padding:8px 10px;vertical-align:middle;text-align:center;line-height:1;">
                    <span style="font-size:20px;color:#0D0C22;font-weight:bold;line-height:1;">✦</span>
                  </td>
                  <td style="padding-left:12px;vertical-align:middle;">
                    <span style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px;">Clariva</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 16px;color:#fff;font-size:24px;font-weight:700;line-height:1.3;">
                Verify Your Email Address
              </h1>
              <p style="margin:0 0 8px;color:#94a3b8;font-size:15px;line-height:1.6;">
                Hi ${userName},
              </p>
              <p style="margin:0 0 28px;color:#94a3b8;font-size:15px;line-height:1.6;">
                Thanks for signing up with Clariva! To complete your registration and start using your account, please verify your email address by clicking the button below.
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#57dffe;border-radius:10px;">
                    <a href="${verificationLink}"
                       style="display:inline-block;padding:14px 32px;color:#0D0C22;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.2px;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:28px 0 0;color:#64748b;font-size:13px;line-height:1.5;">
                This link will expire in 24 hours. If you didn't create a Clariva account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;background:rgba(255,255,255,0.02);border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="margin:0;color:#64748b;font-size:12px;">
                © ${new Date().getFullYear()} Clariva. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildPasswordResetHtml(payload: PasswordResetEmailPayload): string {
  const { userName, resetLink } = payload;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Your Password - Clariva</title>
</head>
<body style="margin:0;padding:0;background:#0D0C22;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0C22;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#13122b;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a3e 0%,#0D0C22 100%);padding:32px 40px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#57dffe;border-radius:10px;padding:8px 10px;vertical-align:middle;text-align:center;line-height:1;">
                    <span style="font-size:20px;color:#0D0C22;font-weight:bold;line-height:1;">✦</span>
                  </td>
                  <td style="padding-left:12px;vertical-align:middle;">
                    <span style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px;">Clariva</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 16px;color:#fff;font-size:24px;font-weight:700;line-height:1.3;">
                Reset Your Password
              </h1>
              <p style="margin:0 0 8px;color:#94a3b8;font-size:15px;line-height:1.6;">
                Hi ${userName},
              </p>
              <p style="margin:0 0 28px;color:#94a3b8;font-size:15px;line-height:1.6;">
                You recently requested to reset your password. Click the button below to create a new password. This link will expire in 1 hour for security reasons.
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#57dffe;border-radius:10px;">
                    <a href="${resetLink}"
                       style="display:inline-block;padding:14px 32px;color:#0D0C22;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.2px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:28px 0 0;color:#64748b;font-size:13px;line-height:1.5;">
                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;background:rgba(255,255,255,0.02);border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="margin:0;color:#64748b;font-size:12px;">
                © ${new Date().getFullYear()} Clariva. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send a team invitation email.
 *
 * When Brevo API key is not configured (local development), the invitation link
 * is printed to the console so developers can test without an email service.
 */
export async function sendInvitationEmail(
  payload: InvitationEmailPayload,
): Promise<void> {
  const { toEmail, teamName, inviteLink } = payload;
  const subject = `You're invited to join "${teamName}" on Clariva`;
  const html = buildInvitationHtml(payload);
  const text = `You've been invited to join the team "${teamName}" on Clariva.\nClick here to accept: ${inviteLink}`;

  if (!BREVO_API_KEY) {
    // Development / no Brevo API configured — log so the invite link is accessible.
    logger.info(
      { to: toEmail, subject, inviteLink },
      "[Email – console fallback] Team invitation email",
    );
    console.log("\n========== INVITATION EMAIL (console fallback) ==========");
    console.log(`To:      ${toEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Link:    ${inviteLink}`);
    console.log("=========================================================\n");
    return;
  }

  if (useHttpApi) {
    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "api-key": BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: { name: sender.name, email: HTTP_SENDER_EMAIL },
          replyTo: { email: REPLY_TO_EMAIL },
          to: [{ email: toEmail }],
          subject,
          htmlContent: html,
          textContent: text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Brevo API responded with status ${response.status}: ${errorText}`,
        );
      }

      logger.info(
        { to: toEmail, subject },
        "Invitation email sent via Brevo HTTP API",
      );
    } catch (error) {
      logger.error(
        { error, to: toEmail },
        "Failed to send invitation email via Brevo HTTP API",
      );
      throw error;
    }
  } else if (smtpTransporter) {
    try {
      await smtpTransporter.sendMail({
        from: FROM,
        replyTo: REPLY_TO_EMAIL,
        to: toEmail,
        subject,
        text,
        html,
      });
      logger.info(
        { to: toEmail, subject },
        "Invitation email sent via Brevo SMTP Relay",
      );
    } catch (error) {
      logger.error(
        { error, to: toEmail },
        "Failed to send invitation email via Brevo SMTP Relay",
      );
      throw error;
    }
  } else {
    logger.warn(
      "Brevo configuration is present but transport mode is undetermined. Logging to console.",
    );
    console.log(
      "\n========== INVITATION EMAIL (undetermined transport fallback) ==========",
    );
    console.log(`To:      ${toEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Link:    ${inviteLink}`);
    console.log(
      "========================================================================\n",
    );
  }
}

/**
 * Send an email verification link to a newly registered user.
 *
 * When Brevo API key is not configured (local development), the verification link
 * is printed to the console so developers can test without an email service.
 */
export async function sendVerificationEmail(
  payload: VerificationEmailPayload,
): Promise<void> {
  const { toEmail, userName, verificationLink } = payload;
  const subject = "Verify your Clariva account";
  const html = buildVerificationHtml(payload);
  const text = `Hi ${userName},\n\nThanks for signing up with Clariva! Please verify your email address by clicking this link:\n${verificationLink}\n\nThis link will expire in 24 hours.`;

  if (!BREVO_API_KEY) {
    // Development / no Brevo API configured — log so the verification link is accessible.
    logger.info(
      { to: toEmail, subject, verificationLink },
      "[Email – console fallback] Verification email",
    );
    console.log(
      "\n========== VERIFICATION EMAIL (console fallback) ==========",
    );
    console.log(`To:      ${toEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Link:    ${verificationLink}`);
    console.log(
      "===========================================================\n",
    );
    return;
  }

  if (useHttpApi) {
    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "api-key": BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: { name: sender.name, email: HTTP_SENDER_EMAIL },
          replyTo: { email: REPLY_TO_EMAIL },
          to: [{ email: toEmail }],
          subject,
          htmlContent: html,
          textContent: text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Brevo API responded with status ${response.status}: ${errorText}`,
        );
      }

      logger.info(
        { to: toEmail, subject },
        "Verification email sent via Brevo HTTP API",
      );
    } catch (error) {
      logger.error(
        { error, to: toEmail },
        "Failed to send verification email via Brevo HTTP API",
      );
      throw error;
    }
  } else if (smtpTransporter) {
    try {
      await smtpTransporter.sendMail({
        from: FROM,
        replyTo: REPLY_TO_EMAIL,
        to: toEmail,
        subject,
        text,
        html,
      });
      logger.info(
        { to: toEmail, subject },
        "Verification email sent via Brevo SMTP Relay",
      );
    } catch (error) {
      logger.error(
        { error, to: toEmail },
        "Failed to send verification email via Brevo SMTP Relay",
      );
      throw error;
    }
  } else {
    logger.warn(
      "Brevo configuration is present but transport mode is undetermined. Logging to console.",
    );
    console.log(
      "\n========== VERIFICATION EMAIL (undetermined transport fallback) ==========",
    );
    console.log(`To:      ${toEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Link:    ${verificationLink}`);
    console.log(
      "==========================================================================\n",
    );
  }
}

/**
 * Send a password reset link to a user who requested it.
 *
 * When Brevo API key is not configured (local development), the reset link
 * is printed to the console so developers can test without an email service.
 */
export async function sendPasswordResetEmail(
  payload: PasswordResetEmailPayload,
): Promise<void> {
  const { toEmail, userName, resetLink } = payload;
  const subject = "Reset your Clariva password";
  const html = buildPasswordResetHtml(payload);
  const text = `Hi ${userName},\n\nYou recently requested to reset your password. Click this link to reset it:\n${resetLink}\n\nThis link will expire in 1 hour. If you didn't request this, you can safely ignore this email.`;

  if (!BREVO_API_KEY) {
    // Development / no Brevo API configured — log so the reset link is accessible.
    logger.info(
      { to: toEmail, subject, resetLink },
      "[Email – console fallback] Password reset email",
    );
    console.log(
      "\n========== PASSWORD RESET EMAIL (console fallback) ==========",
    );
    console.log(`To:      ${toEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Link:    ${resetLink}`);
    console.log(
      "=============================================================\n",
    );
    return;
  }

  if (useHttpApi) {
    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "api-key": BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: { name: sender.name, email: HTTP_SENDER_EMAIL },
          replyTo: { email: REPLY_TO_EMAIL },
          to: [{ email: toEmail }],
          subject,
          htmlContent: html,
          textContent: text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Brevo API responded with status ${response.status}: ${errorText}`,
        );
      }

      logger.info(
        { to: toEmail, subject },
        "Password reset email sent via Brevo HTTP API",
      );
    } catch (error) {
      logger.error(
        { error, to: toEmail },
        "Failed to send password reset email via Brevo HTTP API",
      );
      throw error;
    }
  } else if (smtpTransporter) {
    try {
      await smtpTransporter.sendMail({
        from: FROM,
        replyTo: REPLY_TO_EMAIL,
        to: toEmail,
        subject,
        text,
        html,
      });
      logger.info(
        { to: toEmail, subject },
        "Password reset email sent via Brevo SMTP Relay",
      );
    } catch (error) {
      logger.error(
        { error, to: toEmail },
        "Failed to send password reset email via Brevo SMTP Relay",
      );
      throw error;
    }
  } else {
    logger.warn(
      "Brevo configuration is present but transport mode is undetermined. Logging to console.",
    );
    console.log(
      "\n========== PASSWORD RESET EMAIL (undetermined transport fallback) ==========",
    );
    console.log(`To:      ${toEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Link:    ${resetLink}`);
    console.log(
      "============================================================================\n",
    );
  }
}
