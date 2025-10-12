import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@blocksign.md';
const ADMIN_PUBLIC_KEY_HEX = process.argv[2];

if (!ADMIN_PUBLIC_KEY_HEX) {
  console.error('Usage: ts-node scripts/admin-set-key.ts <PUBLIC_KEY_HEX>');
  process.exit(1);
}

async function main() {
  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!admin) throw new Error('Admin not found. Seed admin first.');

  await prisma.user.update({
    where: { id: admin.id },
    data: { publicKeyEd25519: ADMIN_PUBLIC_KEY_HEX.toLowerCase(), keyCreatedAt: new Date() }
  });

  console.log('Admin key set.');
}

main().finally(() => prisma.$disconnect());
