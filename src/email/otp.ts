import crypto from 'crypto';
import { addMinutes } from 'date-fns';
import { prisma } from '../prisma.js';

const OTP_PEPPER = process.env.OTP_PEPPER || 'dev-pepper-change-me';

export function generateOtpCode(len = 6) {
  const n = crypto.randomInt(0, 10 ** len);
  return n.toString().padStart(len, '0');
}

export function hashOtp(code: string) {
  return crypto.createHmac('sha256', OTP_PEPPER).update(code).digest('hex');
}

export async function createEmailOtp(email: string, ttlMinutes = 10) {
  const code = generateOtpCode(6);
  const codeHash = hashOtp(code);
  const expiresAt = addMinutes(new Date(), ttlMinutes);
  await prisma.emailOtp.create({
    data: { email, purpose: 'REGISTER_EMAIL', codeHash, expiresAt }
  });
  return { code, expiresAt };
}

export async function verifyEmailOtp(email: string, code: string) {
  const latest = await prisma.emailOtp.findFirst({
    where: { email, purpose: 'REGISTER_EMAIL', usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' }
  });
  if (!latest) return { ok: false, reason: 'No valid code' };

  // rate limiting per code
  if (latest.attemptCount >= 5) return { ok: false, reason: 'Too many attempts' };

  const good = latest.codeHash === hashOtp(code);
  await prisma.emailOtp.update({
    where: { id: latest.id },
    data: {
      attemptCount: { increment: 1 },
      usedAt: good ? new Date() : null
    }
  });
  return { ok: good, reason: good ? undefined : 'Invalid code' };
}
