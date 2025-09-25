import { Router } from 'express';
import { prisma } from '../prisma.js';
import { z } from 'zod';
import crypto from 'crypto';
import { addMinutes } from 'date-fns';
import { addDays } from 'date-fns';
import { ed } from '../crypto/ed25519.js'; 
import { signAccessToken, signRefreshToken, verifyToken } from '../utils/tokens.js';


export const auth = Router();

// TODO: integrate username in auth (user enters username or email)
// Challenge routes
const startSchema = z.object({ email: z.string() });
auth.post('/challenge', async (req, res, next) => {
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
  email: z.string(),
  challenge: z.string(),
  signatureB64: z.string()
});

auth.post('/complete', async (req, res, next) => {
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
    
    await prisma.loginChallenge.deleteMany({ where: { id: lc.id } });

    // issue tokens (same as your existing token strategy)
    const payload = { sub: user.id, role: user.role as 'USER' | 'ADMIN' };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.refreshToken.create({
      data: { userId: user.id, token: refreshToken, expiresAt: addMinutes(new Date(), 60 * 24 * 7) }
    });

    res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } });
  } catch (e) { next(e); }
});

auth.post('/refresh', async (req, res) => {
  try {
    let refreshToken = null;
    
    const cookieHeader = req.headers.cookie;
    const cookieRefreshToken = cookieHeader?.match(/refresh_token=[^;]+/);
    if (cookieRefreshToken) {
      refreshToken = cookieRefreshToken[0].split('=')[1];
    }
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Missing refresh token' });
    }

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      // cleanup if present
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // verify JWT signature & claims
    let payload: { sub: string; role: 'USER' | 'ADMIN' };
    try {
      payload = verifyToken(refreshToken) as any;
    } catch {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // rotate tokens
    const accessToken = signAccessToken({ sub: payload.sub, role: payload.role });
    const newRefresh  = signRefreshToken({ sub: payload.sub, role: payload.role });

    // replace old token in DB (rotation)
    await prisma.$transaction([
      prisma.refreshToken.deleteMany({ where: { token: refreshToken } }),
      prisma.refreshToken.create({
        data: {
          userId: payload.sub,
          token: newRefresh,
          expiresAt: addDays(new Date(), 7) 
        }
      })
    ]);

    return res.json({ 
      accessToken,
      refreshToken: newRefresh 
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to refresh token' });
  }
});