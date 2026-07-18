import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const hasSmtpConfig = env.SMTP_HOST !== 'localhost' || (env.SMTP_USER && env.SMTP_PASS);

const transporter = hasSmtpConfig
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    })
  : null;

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const verificationUrl = `${env.FRONTEND_URL}/api/auth/verify-email/${token}`;

  if (!transporter) {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║         📧 VERIFICATION EMAIL (DEV MODE)           ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log(`║  To: ${to}`);
    console.log(`║  Link: ${verificationUrl}`);
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('');
    return;
  }

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject: 'Verify your email address — Sprintio',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Verify your email address</h2>
        <p style="color: #666; line-height: 1.6;">
          Thank you for registering with Sprintio. Please click the button below to verify your email address.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Verify Email
          </a>
        </div>
        <p style="color: #999; font-size: 14px;">
          If the button doesn't work, copy and paste this link into your browser:
        </p>
        <p style="color: #3b82f6; font-size: 14px; word-break: break-all;">
          ${verificationUrl}
        </p>
        <p style="color: #999; font-size: 14px; margin-top: 20px;">
          This link will expire in 24 hours.
        </p>
      </div>
    `,
  });
}
