import { Router } from 'express';
import { prisma } from '../prisma.js';

export const user = Router();

// Get current user profile 
user.get('/me', async (req, res, next) => {
  console.log(req);
  try {
    const { id } = (req as any).user as { id: string };
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, fullName: true, role: true, status: true,
        createdAt: true, updatedAt: true
      }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (e) { next(e); }
});
