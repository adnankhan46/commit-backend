import { Resend } from "resend";
import config from "../../config/env.js";
import logger from "../../utils/logger.js";

const resend = new Resend(config.RESEND_API);

export async function sendInviteEmail(
  to: string,
  inviteCode: string,
  inviterEmail: string
): Promise<void> {
  try {
    await resend.emails.send({
      from: config.EMAIL_FROM,
      to,
      subject: "You've been invited to Commit",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 24px;">
          <h2 style="margin-bottom: 8px;">You're invited to Commit</h2>
          <p style="color: #444;">
            <strong>${inviterEmail}</strong> has invited you to join Commit —
            the habit app where your money is on the line.
          </p>
          <p style="color: #444;">Your invite code:</p>
          <div style="background: #f4f4f4; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0;">
            <span style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #000;">${inviteCode}</span>
          </div>
          <p style="color: #666; font-size: 14px;">
            Open the Commit app, enter your email and this code to create your account.
          </p>
        </div>
      `,
    });
    logger.info(`[Email]: Invite sent to ${to}`);
  } catch (err) {
    logger.error(`[Email]: Failed to send invite to ${to}: ${err}`);
    throw new Error("Failed to send invite email. Please try again.");
  }
}
