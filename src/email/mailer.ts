import nodemailer from 'nodemailer';

const {
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
} = process.env;

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !MAIL_FROM) {
  console.warn('[mailer] SMTP env vars not fully set; emails may fail in dev.');
}

export const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: true,
  auth: { user: SMTP_USER, pass: SMTP_PASS }
});

export async function sendEmail(to: string, subject: string, html: string) {
  const info = await transporter.sendMail({
    from: MAIL_FROM || `BlockSign <${SMTP_USER}>`,
    to,
    subject,
    html
  });
  console.log('[mailer] sent:', info.messageId);
}

export function otpTemplate(code: string) {
  return `
  <div style="font-family:Arial,sans-serif">
    <h2>Verify your email</h2>
    <p>Your verification code is:</p>
    <div style="font-size:24px;font-weight:bold;letter-spacing:3px">${code}</div>
    <p>This code expires in 10 minutes. If you didn’t request this, you can ignore this email.</p>
  </div>`;
}

export function finalizeTemplate(token: string, linkBase: string) {
  const url = `${linkBase.replace(/\/$/, '')}/register/finish?token=${encodeURIComponent(token)}`;
  return `
  <div style="font-family:Arial,sans-serif">
    <h2>Finish your BlockSign registration</h2>
    <p>Click the button below to finalize your account setup:</p>
    <p><a href="${url}"
          style="display:inline-block;background:#1f6feb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">
       Finish Registration
    </a></p>
    <p>If the button doesn’t work, copy & paste this link:</p>
    <p><code>${url}</code></p>
    <p>This link expires in 30 minutes.</p>
  </div>`;
}
