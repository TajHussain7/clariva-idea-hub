import nodemailer from "nodemailer";
import { logger } from "./logger.js";

// ─── Transporter ─────────────────────────────────────────────────────────────

/**
 * Build a nodemailer transporter from environment variables.
 * Returns null when SMTP credentials are not configured — in that
 * case every send call falls back to console logging so development
 * works without any email infrastructure.
 */
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === "true";

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

const transporter = createTransporter();
const FROM = process.env.SMTP_FROM ?? "Clariva <noreply@clariva.com>";

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
                  <td style="background:#57dffe;border-radius:10px;padding:8px 10px;vertical-align:middle;">
                    <span style="font-size:18px;">*</span>
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
              <p style="margin:24px 0 0;color:#64748b;font-size:12px;line-height:1.6;">
                Or copy this link into your browser:<br/>
                <a href="${inviteLink}" style="color:#57dffe;word-break:break-all;">${inviteLink}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;color:#475569;font-size:12px;line-height:1.6;">
                This invitation was sent by ${inviterName} via Clariva.
                If you weren't expecting this, you can safely ignore this email.
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
 * When SMTP is not configured (local development), the invitation link
 * is printed to the console so developers can test without a mail server.
 */
export async function sendInvitationEmail(
  payload: InvitationEmailPayload,
): Promise<void> {
  const { toEmail, teamName, inviteLink } = payload;
  const subject = `You're invited to join "${teamName}" on Clariva`;
  const html = buildInvitationHtml(payload);
  const text = `You've been invited to join the team "${teamName}" on Clariva.\nClick here to accept: ${inviteLink}`;

  if (!transporter) {
    // Development / no SMTP configured — log so the invite link is accessible.
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

  await transporter.sendMail({ from: FROM, to: toEmail, subject, text, html });
  logger.info({ to: toEmail, subject }, "Invitation email sent");
}
