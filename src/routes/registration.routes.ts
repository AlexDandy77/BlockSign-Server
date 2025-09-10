import { Router } from 'express';
import { prisma } from '../prisma.js';
import { z } from 'zod';
import * as ed from '@noble/ed25519';

export const registration = Router();

// request registration
const requestSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(120),
  phone: z.string().min(5).max(20),
  idnp: z.string().min(5).max(20)
});

registration.post('/request', async (req, res, next) => {
  try {
    const data = requestSchema.parse(req.body);

    // if an existing RegistrationRequest exists, block or update based on policy
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

// complete registration with token and public key
const completeSchema = z.object({
  token: z.string().min(10),
  publicKeyEd25519Hex: z.string().min(64), // hex
  signatureB64: z.string()
});

registration.post('/complete', async (req, res, next) => {
  try {
    const { token, publicKeyEd25519Hex, signatureB64 } = completeSchema.parse(req.body);

    const et = await prisma.emailToken.findUnique({ where: { token }, include: { regRequest: true } });
    if (!et || et.usedAt || et.expiresAt < new Date()) return res.status(400).json({ error: 'Invalid or expired token' });

    const rr = et.regRequest;
    if (rr.status !== 'APPROVED') return res.status(400).json({ error: 'Registration not approved' });

    // Verify signature: message = token UTF-8
    const msg = new TextEncoder().encode(token);
    const sig = Buffer.from(signatureB64, 'base64');
    const pub = Buffer.from(publicKeyEd25519Hex, 'hex');

    const ok = await ed.verify(sig, msg, pub);
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