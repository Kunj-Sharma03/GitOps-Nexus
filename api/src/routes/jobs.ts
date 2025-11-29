import { Router } from 'express'
import prisma from '../lib/prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

router.use(authMiddleware)

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } })
    if (!job) return res.status(404).json({ error: 'Job not found' })
    return res.json({ job })
  } catch (err: any) {
    console.error('[jobs] GET /:id error', err)
    return res.status(500).json({ error: 'Failed to fetch job', details: err?.message || String(err) })
  }
})

export default router
