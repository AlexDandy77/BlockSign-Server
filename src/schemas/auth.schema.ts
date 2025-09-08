import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(120),
  password: z.string().min(8).regex(/[a-z]/).regex(/[A-Z]/).regex(/\d/),
  phone: z.string().min(1).optional().or(z.literal('')).transform(v => (v === '' ? undefined : v)),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
