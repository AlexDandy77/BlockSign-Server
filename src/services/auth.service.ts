import { prisma } from '../prisma.js';
import argon2 from 'argon2';
import { signAccessToken, signRefreshToken } from '../utils/tokens.js';
import { add } from 'date-fns';

export async function registerUser(input: {
  email: string; fullName: string; password: string; phone?: string | undefined | null;
}) {
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw { status: 409, message: 'Email already registered' };

  const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
  const user = await prisma.user.create({
    data: { email: input.email, fullName: input.fullName, passwordHash, phone: input.phone ?? null }
  });

  // Return minimal profile
  return { id: user.id, email: user.email, fullName: user.fullName, role: user.role };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw { status: 401, message: 'Invalid credentials' };

  const ok = await argon2.verify(user.passwordHash, password);
  if (!ok) throw { status: 401, message: 'Invalid credentials' };

  const payload = { sub: user.id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: add(new Date(), { days: 7 })
    }
  });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role }
  };
}

export async function rotateRefreshToken(oldToken: string) {
  const existing = await prisma.refreshToken.findUnique({ where: { token: oldToken } });
  if (!existing || existing.expiresAt < new Date()) throw { status: 401, message: 'Invalid refresh' };

  const user = await prisma.user.findUnique({ where: { id: existing.userId } });
  if (!user) throw { status: 401, message: 'Invalid refresh' };

  // revoke old
  await prisma.refreshToken.delete({ where: { token: oldToken } });

  const payload = { sub: user.id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  await prisma.refreshToken.create({
    data: { userId: user.id, token: refreshToken, expiresAt: add(new Date(), { days: 7 }) }
  });

  return { accessToken, refreshToken };
}

export async function logout(refreshToken: string) {
  await prisma.refreshToken.delete({ where: { token: refreshToken } }).catch(() => {});
}
