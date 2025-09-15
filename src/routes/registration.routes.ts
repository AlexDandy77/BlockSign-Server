import { Router } from 'express';
import { prisma } from '../prisma.js';
import { z } from 'zod';
import * as ed from '@noble/ed25519';
import { sendEmail, otpTemplate, finalizeTemplate } from '../email/mailer.js';
import { createEmailOtp, verifyEmailOtp } from '../email/otp.js';
import { addMinutes } from 'date-fns';
import crypto from 'crypto';

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

export const registration = Router();

// Send OTP to verify email
const startSchema = z.object({ email: z.string().email() });

registration.post('/request/start', async (req, res, next) => {
  try {
    const { email } = startSchema.parse(req.body);

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const { code } = await createEmailOtp(email, 10);
    await sendEmail(email, 'Your verification code', otpTemplate(code));
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Verify OTP — unlock the next step
const verifySchema = z.object({ email: z.string().email(), code: z.string().length(6) });

registration.post('/request/verify', async (req, res, next) => {
  try {
    const { email, code } = verifySchema.parse(req.body);
    const { ok, reason } = await verifyEmailOtp(email, code);
    if (!ok) return res.status(400).json({ error: reason || 'Invalid code' });
    // Flag the session/email as verified in your client (JWT or temp session)
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Request registration
const requestSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(120),
  phone: z.string().min(5).max(20),
  idnp: z.string().min(5).max(20)
});

registration.post('/request', async (req, res, next) => {
  try {
    const data = requestSchema.parse(req.body);

    const existing = await prisma.registrationRequest.findUnique({ where: { email: data.email } });
    if (existing && existing.status !== 'DECLINED') {
      return res.status(409).json({ error: 'A request for this email already exists' });
    }

    const rr = await prisma.registrationRequest.upsert({
      where: { email: data.email },
      update: { fullName: data.fullName, phone: data.phone, idnp: data.idnp, status: 'PENDING' },
      create: { email: data.email, fullName: data.fullName, phone: data.phone, idnp: data.idnp}
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
        fullName: rr.fullName,
        phone: rr.phone ?? null,
        publicKeyEd25519: publicKeyEd25519Hex.toLowerCase(),
        keyCreatedAt: new Date(),
        createdFromRequestId: rr.id
      },
      create: {
        email: rr.email,
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
      prisma.emailToken.update({ where: { id: et.id }, data: { usedAt: new Date() } }),
      prisma.registrationRequest.update({ where: { id: rr.id }, data: { status: 'COMPLETED' } })
    ]);

    res.status(201).json({ user: { id: user.id, email: user.email, fullName: user.fullName } });
  } catch (e) { next(e); }
});