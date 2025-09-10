import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireAdmin } from '../middlewares/requireAdmin.js';
import crypto from 'crypto';
import { addMinutes } from 'date-fns';

export const adminReg = Router();

adminReg.use(requireAdmin);

// List pending
adminReg.get('/registrations', async (_req, res, next) => {
  try {
    const items = await prisma.registrationRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' }
    });
    res.json({ items });
  } catch (e) { next(e); }
});

// Approve: create EmailToken and (TODO) send email with link
adminReg.post('/registrations/:id/approve', async (req, res, next) => {
  try {
    const { id } = req.params;
    const rr = await prisma.registrationRequest.findUnique({ where: { id } });
    if (!rr || rr.status !== 'PENDING') return res.status(404).json({ error: 'Not found or not pending' });

    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = addMinutes(new Date(), 30); // 30 min window to finish

    await prisma.$transaction([
      prisma.registrationRequest.update({ where: { id }, data: { status: 'APPROVED', decidedAt: new Date() } }),
      prisma.emailToken.create({ data: { regRequestId: id, token, expiresAt } })
    ]);

    // TODO: send email with frontend link, e.g. https://app/finish?token=...
    // await sendFinalizeEmail(rr.email, token)

    res.json({ ok: true, token }); // return token now for dev
  } catch (e) { next(e); }
});

// Decline
adminReg.post('/registrations/:id/decline', async (req, res, next) => {
  try {
    const { id } = req.params;
    const rr = await prisma.registrationRequest.findUnique({ where: { id } });
    if (!rr || rr.status !== 'PENDING') return res.status(404).json({ error: 'Not found or not pending' });

    await prisma.registrationRequest.update({
      where: { id },
      data: { status: 'DECLINED', decidedAt: new Date() }
    });

    res.json({ ok: true });
  } catch (e) { next(e); }
});
