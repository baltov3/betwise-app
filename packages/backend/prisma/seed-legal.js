import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const baseDate = new Date().toISOString()
  const legalDocs = [
    { type: 'TERMS',    version: '1.0.0', title: 'Общи условия',              contentUrl: '/legal#tos' },
    { type: 'PRIVACY',  version: '1.0.0', title: 'Политика за поверителност', contentUrl: '/legal#privacy' },
    { type: 'AGE',      version: '1.0.0', title: 'Възрастово ограничение',    contentUrl: '/legal#age' },
    { type: 'REFERRAL', version: '1.0.0', title: 'Партньорска програма',      contentUrl: '/legal#referral' },
    { type: 'COOKIES',  version: '1.0.0', title: 'Политика за бисквитки',     contentUrl: '/legal#cookies' },
    { type: 'REFUND',   version: '1.0.0', title: 'Отказ и възстановяване',    contentUrl: '/legal#refunds' },
  ]

  for (const d of legalDocs) {
    await prisma.legalDocument.upsert({
      where: { type_version: { type: d.type, version: d.version } },
      create: { ...d, effectiveAt: baseDate, isActive: true },
      update: { isActive: true },
    })
  }

  console.log('Seeded legal documents (v1.0.0)')
}

main().catch(console.error).finally(() => prisma.$disconnect())