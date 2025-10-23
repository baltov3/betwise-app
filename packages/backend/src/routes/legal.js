import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const router = Router()

// GET /api/legal-documents — връща най-новата активна версия за всеки тип
router.get('/legal-documents', async (req, res) => {
  try {
    const docs = await prisma.legalDocument.findMany({
      where: { isActive: true },
      orderBy: [{ type: 'asc' }, { effectiveAt: 'desc' }],
    })

    // по една последна версия за тип
    const latest = Object.values(
      docs.reduce((acc, d) => {
        if (!acc[d.type]) acc[d.type] = d
        return acc
      }, {})
    )

    res.json(
      latest.map((d) => ({
        type: d.type,
        title: d.title,
        version: d.version,
        effectiveAt: d.effectiveAt,
        url: d.contentUrl ?? `/legal/${d.type.toLowerCase()}`,
      }))
    )
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Грешка при зареждане на правни документи' })
  }
})

export default router