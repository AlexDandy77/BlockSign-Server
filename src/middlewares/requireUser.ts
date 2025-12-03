import type { Request, Response, NextFunction } from 'express';

export function requireUser(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user; // set by your JWT auth middleware
    if (!user || user.role !== 'USER') return res.status(403).json({ error: 'User only' });
    next();
}