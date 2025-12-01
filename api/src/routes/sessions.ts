import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { ciQueue } from '../lib/queue';

const router = Router();

// Validation schemas
const createSessionSchema = z.object({
  repoId: z.string().optional(),
  ttlMinutes: z.number().min(5).max(120).default(30),
});

// GET /api/sessions - List active sessions for the user
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await prisma.session.findMany({
      where: {
        userId: req.userId!,
        status: {
          in: ['STARTING', 'RUNNING'],
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
      },
    });
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// POST /api/sessions - Create a new sandbox session
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validation = createSessionSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.issues });
    }

    const { repoId, ttlMinutes } = validation.data;

    // Check if user already has max active sessions (e.g., 3)
    const activeCount = await prisma.session.count({
      where: {
        userId: req.userId!,
        status: { in: ['STARTING', 'RUNNING'] },
      },
    });

    if (activeCount >= 3) {
      return res.status(400).json({ error: 'Maximum active sessions limit reached (3)' });
    }

    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    const session = await prisma.session.create({
      data: {
        userId: req.userId!,
        repoId,
        status: 'STARTING',
        expiresAt,
      },
    });

    // Trigger container creation
    await ciQueue.add('session-start', { sessionId: session.id });

    res.status(201).json({ session });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// GET /api/sessions/:id - Get session details
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.userId !== req.userId!) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({ session });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// DELETE /api/sessions/:id - Terminate session
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.userId !== req.userId!) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updated = await prisma.session.update({
      where: { id: req.params.id },
      data: { status: 'STOPPED' },
    });

    // TODO: Trigger container cleanup (Day 22)

    res.json({ session: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to terminate session' });
  }
});

export default router;
