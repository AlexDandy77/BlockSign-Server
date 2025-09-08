import jwt from 'jsonwebtoken';
import { env } from '../env.js';

export type JwtPayload = { sub: string; role: 'USER' | 'ADMIN' };

export const signAccessToken = (payload: JwtPayload) =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_ACCESS_TTL });

export const signRefreshToken = (payload: JwtPayload) =>
  jwt.sign({ ...payload, typ: 'refresh' }, env.JWT_SECRET, { expiresIn: env.JWT_REFRESH_TTL });

export const verifyToken = (token: string) => jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
