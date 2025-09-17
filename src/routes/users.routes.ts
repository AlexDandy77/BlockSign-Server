import { Router } from 'express';
import { prisma } from '../prisma.js';

export const user = Router();

// Get current user profile 
user.get('/me', async (req, res, next) => {
  try {
    const { sub } = (req as any).auth as { sub: string };
    const user = await prisma.user.findUnique({
      where: { id: sub },
      select: {
        id: true, email: true, fullName: true, role: true, status: true,
        createdAt: true, updatedAt: true
      }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (e) { next(e); }
});
