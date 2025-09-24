import { Router } from 'express';
import { prisma } from '../prisma.js';
import { z } from 'zod';
import * as ed from '@noble/ed25519';
import { sendEmail, otpTemplate } from '../email/mailer.js';
import { createEmailOtp, verifyEmailOtp } from '../email/otp.js';

export const registration = Router();

// Send OTP to verify email
const startSchema = z.object({ email: z.string() });

registration.post('/request/start', async (req, res, next) => {
  try {
    const { email } = startSchema.parse(req.body);

    const existsEmail = await prisma.user.findUnique({ where: { email } });
    if (existsEmail) return res.status(409).json({ error: 'Email is already registered' });
    
    const { code } = await createEmailOtp(email, 10);
    await sendEmail(email, 'Your verification code', otpTemplate(code));
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Verify OTP — unlock the next step
const verifySchema = z.object({ email: z.string(), code: z.string().length(6) });

registration.post('/request/verify', async (req, res, next) => {
  try {
    const { email, code } = verifySchema.parse(req.body);
    const { ok, reason } = await verifyEmailOtp(email, code);
    if (!ok) return res.status(400).json({ error: reason || 'Invalid code' });
    await prisma.emailOtp.deleteMany({ where: { email } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Request registration
const requestSchema = z.object({
  email: z.email(),
  fullName: z.string().min(1).max(120),
  phone: z.string().min(5).max(20),
  idnp: z.string().min(5).max(20),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9._-]+$/),
});

registration.post('/request', async (req, res, next) => {
  try {
    const data = requestSchema.parse(req.body);

    const existing = await prisma.registrationRequest.findUnique({ where: { email: data.email } });
    if (existing && existing.status !== 'DECLINED') {
      return res.status(409).json({ error: 'A request for this email already exists' });
    }

    const existingUser = await prisma.user.findUnique({ where: { username: data.username } });
    if (existingUser) {
      return res.status(409).json({ error: 'Username is already taken' });
    }

    const rr = await prisma.registrationRequest.upsert({
      where: { email: data.email },
      update: { username: data.username, fullName: data.fullName, phone: data.phone, idnp: data.idnp, status: 'PENDING' },
      create: { email: data.email, username: data.username, fullName: data.fullName, phone: data.phone, idnp: data.idnp}
    });

    res.status(201).json({ requestId: rr.id });
  } catch (e) { next(e); }
});

// Complete registration with token and public key
const completeSchema = z.object({
  token: z.string().min(10),
  publicKeyEd25519Hex: z.string().min(64),
  signatureB64: z.string()
});

registration.post('/complete', async (req, res, next) => {
  try {
    const { token, publicKeyEd25519Hex, signatureB64 } = completeSchema.parse(req.body);

    const et = await prisma.emailToken.findUnique({ where: { token }, include: { regRequest: true } });
    if (!et || et.usedAt || et.expiresAt < new Date()) return res.status(400).json({ error: 'Invalid or expired token' });

    const rr = et.regRequest;
    if (rr.status !== 'APPROVED') return res.status(400).json({ error: 'Registration not approved' });

    // Verify signature
    const pub = Buffer.from(publicKeyEd25519Hex, 'hex');
    const msg = Buffer.from(token, 'utf8');
    const sig = Buffer.from(signatureB64, 'base64');

    const ok = await ed.verifyAsync(sig, msg, pub);
    if (!ok) return res.status(400).json({ error: 'Signature verification failed' });

    // Create or upsert user
    const user = await prisma.user.upsert({
      where: { email: rr.email },
      update: {
        username: rr.username,
        fullName: rr.fullName,
        phone: rr.phone ?? null,
        publicKeyEd25519: publicKeyEd25519Hex.toLowerCase(),
        keyCreatedAt: new Date(),
        createdFromRequestId: rr.id
      },
      create: {
        email: rr.email,
        username: rr.username,
        fullName: rr.fullName,
        phone: rr.phone ?? null,
        publicKeyEd25519: publicKeyEd25519Hex.toLowerCase(),
        keyCreatedAt: new Date(),
        role: 'USER',
        status: 'ACTIVE',
        createdFromRequestId: rr.id
      }
    });

    await prisma.$transaction([
      prisma.emailToken.delete({ where: { id: et.id } }),
      prisma.registrationRequest.delete({ where: { id: rr.id } })
    ]);

    res.status(201).json({ user: { id: user.id, email: user.email, fullName: user.fullName } });
  } catch (e) { next(e); }
});