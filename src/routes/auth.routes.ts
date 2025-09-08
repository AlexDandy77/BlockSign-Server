import { Router } from 'express';
import { authLimiter } from '../middlewares/rateLimit.js';
import { loginSchema, registerSchema } from '../schemas/auth.schema.js';
import { loginUser, registerUser, rotateRefreshToken, logout } from '../services/auth.service.js';
import { z } from 'zod';

export const auth = Router();

auth.post('/register', authLimiter, async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const user = await registerUser(data);
    res.status(201).json({ user });
  } catch (e) { next(e); }
});

auth.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await loginUser(email, password);
    // Set refresh cookie (httpOnly)
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.json({ accessToken, user });
  } catch (e) { next(e); }
});

auth.post('/refresh', async (req, res, next) => {
  try {
    const refresh = z.string().parse(req.cookies?.refresh_token);
    const tokens = await rotateRefreshToken(refresh);
    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.json({ accessToken: tokens.accessToken });
  } catch (e) { next(e); }
});

auth.post('/logout', async (req, res, next) => {
  try {
    const token = req.cookies?.refresh_token as string | undefined;
    if (token) await logout(token);
    res.clearCookie('refresh_token');
    res.status(204).send();
  } catch (e) { next(e); }
});
