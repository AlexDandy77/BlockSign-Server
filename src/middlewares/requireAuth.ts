import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/tokens.js';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
    try {
        const token = header.slice(7);
        const payload = verifyToken(token);
        // @ts-ignore
        req.user = { id: payload.sub, role: payload.role };
        next();
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
}
