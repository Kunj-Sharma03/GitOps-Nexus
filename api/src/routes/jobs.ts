import { Router } from 'express'
import fs from 'fs'
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

router.get('/:id/artifacts', async (req: AuthRequest, res) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } })
    if (!job) return res.status(404).json({ error: 'Job not found' })
    if (!job.artifactsPath) return res.status(404).json({ error: 'No artifacts found for this job' })

    // Check if file exists
    if (!fs.existsSync(job.artifactsPath)) {
        return res.status(404).json({ error: 'Artifact file missing on server' })
    }

    res.download(job.artifactsPath, `artifacts-${job.id}.zip`)
  } catch (err: any) {
    console.error('[jobs] GET /:id/artifacts error', err)
    return res.status(500).json({ error: 'Failed to download artifacts' })
  }
})

export default router
