import prisma from '../../../backend/prisma/db/prisma.js';

/**
 * Валидира consents обект срещу активните версии и записва UserAgreement записи.
 * @param {string} userId
 * @param {Record<'TERMS'|'PRIVACY'|'AGE'|'REFERRAL'|'COOKIES'|'REFUND', string>} consents
 * @param {import('express').Request} req
 */
export async function recordUserConsents(userId, consents, req) {
  const required = ['TERMS','PRIVACY','AGE','REFERRAL','COOKIES','REFUND']
  for (const key of required) {
    if (!consents?.[key]) {
      const err = new Error(`Липсва съгласие за ${key}`)
      err.status = 400
      throw err
    }
  }

  const active = await prisma.legalDocument.findMany({
    where: { isActive: true },
    orderBy: [{ type: 'asc' }, { effectiveAt: 'desc' }],
  })

  // последна активна версия по тип
  const latestByType = active.reduce((acc, d) => (acc[d.type] ??= d, acc), {})

  for (const key of required) {
    const doc = latestByType[key]
    if (!doc) {
      const err = new Error(`Няма активен документ за ${key}`)
      err.status = 500
      throw err
    }
    if (doc.version !== consents[key]) {
      const err = new Error(`Некоректна версия за ${key}`)
      err.status = 400
      throw err
    }
    await prisma.userAgreement.create({
      data: {
        userId,
        documentId: doc.id,
        ip: req.ip,
        userAgent: req.headers['user-agent'] || null,
      },
    })
  }
}