// src/routes/auth.passwordless.routes.ts
import { Router } from 'express';
import { prisma } from '../prisma.js';
import { z } from 'zod';
import crypto from 'crypto';
import { addMinutes } from 'date-fns';
import { ed } from '../crypto/ed25519.js';  // relative import needs .js with NodeNext
import { signAccessToken, signRefreshToken } from '../utils/tokens.js';


export const login = Router();

const startSchema = z.object({ email: z.string().email() });
login.post('/challenge', async (req, res, next) => {
  try {
    const { email } = startSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.publicKeyEd25519) return res.status(404).json({ error: 'User not found or key not set' });

    const challenge = crypto.randomBytes(32).toString('base64url');
    const expiresAt = addMinutes(new Date(), 5);

    await prisma.loginChallenge.create({ data: { email, challenge, expiresAt } });
    res.json({ challenge }); // client signs this with private key
  } catch (e) { next(e); }
});

const completeSchema = z.object({
  email: z.string().email(),
  challenge: z.string(),
  signatureB64: z.string()
});

login.post('/complete', async (req, res, next) => {
  try {
    const { email, challenge, signatureB64 } = completeSchema.parse(req.body);

    const lc = await prisma.loginChallenge.findFirst({
      where: { email, challenge, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' }
    });
    if (!lc) return res.status(400).json({ error: 'Invalid or expired challenge' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.publicKeyEd25519) return res.status(404).json({ error: 'User not found or key not set' });

    const pub = Buffer.from(user.publicKeyEd25519, 'hex');
    const msg = Buffer.from(challenge, 'utf8');
    const sig = Buffer.from(signatureB64, 'base64');
    
    const ok = await ed.verifyAsync(sig, msg, pub);
    console.log('Signature valid?', ok);
    if (!ok) return res.status(401).json({ error: 'Signature verification failed' });
    

    // mark used
    await prisma.loginChallenge.update({ where: { id: lc.id }, data: { usedAt: new Date() } });

    // issue tokens (same as your existing token strategy)
    const payload = { sub: user.id, role: user.role as 'USER' | 'ADMIN' };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.refreshToken.create({
      data: { userId: user.id, token: refreshToken, expiresAt: addMinutes(new Date(), 60 * 24 * 7) }
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ accessToken, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } });
  } catch (e) { next(e); }
});
