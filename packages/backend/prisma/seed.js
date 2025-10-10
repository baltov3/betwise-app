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

  // Create categories
  const football = await prisma.category.upsert({
    where: { slug: 'football' },
    update: {},
    create: {
      name: 'Football',
      slug: 'football',
    },
  });

  const basketball = await prisma.category.upsert({
    where: { slug: 'basketball' },
    update: {},
    create: {
      name: 'Basketball',
      slug: 'basketball',
    },
  });

  const tennis = await prisma.category.upsert({
    where: { slug: 'tennis' },
    update: {},
    create: {
      name: 'Tennis',
      slug: 'tennis',
    },
  });

  // Create sample predictions with new schema
  const now = new Date();
  const futureDate1 = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days from now
  const futureDate2 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
  const pastDate1 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
  const pastDate2 = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago

  await prisma.prediction.createMany({
    data: [
      {
        categoryId: football.id,
        title: 'Liverpool vs Manchester City',
        league: 'Premier League',
        homeTeam: 'Liverpool',
        awayTeam: 'Manchester City',
        pick: 'Liverpool to win',
        odds: 2.5,
        scheduledAt: futureDate1,
        status: 'UPCOMING',
        createdBy: admin.id,
      },
      {
        categoryId: football.id,
        title: 'Arsenal vs Chelsea',
        league: 'Premier League',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        pick: 'Over 2.5 goals',
        odds: 1.85,
        scheduledAt: futureDate2,
        status: 'UPCOMING',
        createdBy: admin.id,
      },
      {
        categoryId: basketball.id,
        title: 'Lakers vs Warriors',
        league: 'NBA',
        homeTeam: 'Los Angeles Lakers',
        awayTeam: 'Golden State Warriors',
        pick: 'Over 220.5 total points',
        odds: 1.9,
        scheduledAt: pastDate1,
        status: 'WON',
        resultNote: 'Final score: 115-112. Total 227 points.',
        createdBy: admin.id,
      },
      {
        categoryId: tennis.id,
        title: 'Djokovic vs Nadal',
        league: 'ATP Masters',
        pick: 'Djokovic to win in straight sets',
        odds: 3.2,
        scheduledAt: pastDate2,
        status: 'LOST',
        resultNote: 'Nadal won 2-1',
        createdBy: admin.id,
      },
      {
        categoryId: basketball.id,
        title: 'Celtics vs Heat',
        league: 'NBA',
        homeTeam: 'Boston Celtics',
        awayTeam: 'Miami Heat',
        pick: 'Celtics -5.5',
        odds: 1.95,
        scheduledAt: pastDate1,
        status: 'WON',
        resultNote: 'Celtics won 110-98',
        createdBy: admin.id,
      },
    ],
  });

  console.log('Seed data created successfully!');
  console.log('Admin credentials: admin@betwise.com / admin123');
  console.log('User credentials: user1@example.com / user123');
  console.log('Categories created: Football, Basketball, Tennis');
  console.log('Sample predictions created (upcoming and historical)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });