import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireAdmin } from '../middlewares/requireAdmin.js';
import crypto from 'crypto';
import { sendEmail, finalizeTemplate, registrationDeclinedTemplate } from '../email/mailer.js';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
export const admin = Router();

admin.use(requireAdmin);

admin.get('/me', async (req, res, next) => {
    try {
        const { id } = (req as any).user as { id: string };

        const me = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true, email: true, fullName: true, username: true,
                role: true, status: true, createdAt: true, updatedAt: true
            }
        });
        if (!me) return res.status(404).json({ error: 'User not found' });

        res.json({ admin: me });
    } catch (e) { next(e); }
});

// Registration
// Get all pending registration requests
admin.get('/registrations', async (_req, res, next) => {
    try {
        const items = await prisma.registrationRequest.findMany({
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'asc' }
        });
        res.json({ items });
    } catch (e) { next(e); }
});

// Approve: create EmailToken and send email with link
admin.post('/registrations/:id/approve', async (req, res, next) => {
    try {
        const { id } = req.params;
        const rr = await prisma.registrationRequest.findUnique({ where: { id } });
        if (!rr || rr.status !== 'PENDING') return res.status(404).json({ error: 'Not found or not pending' });

        const token = crypto.randomBytes(32).toString('base64url');

        await prisma.$transaction([
            prisma.registrationRequest.update({ where: { id }, data: { status: 'APPROVED', decidedAt: new Date() } }),
            prisma.emailToken.create({ data: { regRequestId: id, token } })
        ]);

        await sendEmail(rr.email, 'Finalize your registration', finalizeTemplate(rr.email, token, APP_URL));

        res.json({ ok: true });
    } catch (e) { next(e); }
});

// Decline registration
admin.post('/registrations/:id/decline', async (req, res, next) => {
    try {
        const { id } = req.params;
        const rr = await prisma.registrationRequest.findUnique({ where: { id } });
        if (!rr || rr.status !== 'PENDING') return res.status(404).json({ error: 'Not found or not pending' });

        await prisma.registrationRequest.delete({
            where: { id: rr.id }
        });

        await sendEmail(rr.email, 'Registration Request Declined', registrationDeclinedTemplate());

        res.json({ ok: true });
    } catch (e) { next(e); }
});


// Get all users
admin.get('/users', async (req, res, next) => {
    try {
        const take = Math.min(Number(req.query.take ?? 25), 100);
        const skip = Number(req.query.skip ?? 0);
        const list = await prisma.user.findMany({
            skip, take,
            orderBy: { createdAt: 'desc' },
            select: { id: true, email: true, fullName: true, role: true, status: true, createdAt: true, updatedAt: true }
        });
        res.json({ users: list });
    } catch (e) { next(e); }
});

// Get one user
admin.get('/users/:id', async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
            select: { id: true, email: true, fullName: true, role: true, status: true, createdAt: true, updatedAt: true }
        });
        if (!user) return res.status(404).json({ error: 'Not found' });
        res.json({ user });
    } catch (e) { next(e); }
});