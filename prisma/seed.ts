import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@blocksign.local';
  const fullName = process.env.ADMIN_NAME ?? 'System Administrator';

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  console.log(existing);
  
  if (existing) {
    console.log('Admin already exists:', existing.email);
    return;
  }

  // OPTIONAL: seed an Ed25519 public key if you want admin to be able to login with challenge-response
  // For now leave null; admin can complete key setup later via a special UI.

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      username: 'admin',
      fullName,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  console.log('Seeded admin:', admin.email, admin.id);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
