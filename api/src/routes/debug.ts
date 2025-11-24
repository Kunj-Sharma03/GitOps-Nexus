import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Dev-only route to set a user's GitHub token. Protected by JWT.
// Only enabled when NODE_ENV !== 'production'.
router.post('/set-token', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not allowed in production' });
  }

  try {
    const { token } = req.body as { token?: string };
    if (!token) return res.status(400).json({ error: 'token required' });

    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.update({ where: { id: userId }, data: { githubAccessToken: token } });
    res.json({ ok: true, userId: user.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to set token' });
  }
});

export default router;
