import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@betwise.com' },
    update: {},
    create: {
      email: 'admin@betwise.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  // Create test users
  const userPassword = await bcrypt.hash('user123', 12);
  const user1 = await prisma.user.upsert({
    where: { email: 'user1@example.com' },
    update: {},
    create: {
      email: 'user1@example.com',
      password: userPassword,
      role: 'USER',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'user2@example.com' },
    update: {},
    create: {
      email: 'user2@example.com',
      password: userPassword,
      role: 'USER',
      referredBy: user1.id,
    },
  });

  // Create referral relationship
  await prisma.referral.upsert({
    where: {
      referrerId_referredUserId: {
        referrerId: user1.id,
        referredUserId: user2.id,
      },
    },
    update: {},
    create: {
      referrerId: user1.id,
      referredUserId: user2.id,
      commissionRate: 0.1,
      earnedAmount: 0,
    },
  });

  // Create sample predictions
  await prisma.prediction.createMany({
    data: [
      {
        sport: 'Football',
        title: 'Liverpool vs Manchester City',
        description: 'Premier League match - Liverpool to win',
        odds: 2.5,
        matchDate: new Date('2024-01-15T15:00:00Z'),
        createdBy: admin.id,
      },
      {
        sport: 'Basketball',
        title: 'Lakers vs Warriors',
        description: 'NBA regular season - Over 220.5 total points',
        odds: 1.9,
        matchDate: new Date('2024-01-16T20:00:00Z'),
        createdBy: admin.id,
      },
      {
        sport: 'Tennis',
        title: 'Djokovic vs Nadal',
        description: 'ATP Masters - Djokovic to win in straight sets',
        odds: 3.2,
        matchDate: new Date('2024-01-17T14:00:00Z'),
        createdBy: admin.id,
      },
    ],
  });

  console.log('Seed data created successfully!');
  console.log('Admin credentials: admin@betwise.com / admin123');
  console.log('User credentials: user1@example.com / user123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });