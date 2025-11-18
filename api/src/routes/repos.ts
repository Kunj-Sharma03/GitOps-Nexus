import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getBranches, getFileTree, readFile, findReadme } from '../lib/git';

const router = Router();

router.use(authMiddleware);

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { gitUrl, name } = req.body;
    
    if (!gitUrl) {
      return res.status(400).json({ error: 'gitUrl required' });
    }
    
    const repoName = name || gitUrl.split('/').pop()?.replace('.git', '') || 'repo';

    // Ensure the authenticated user actually exists in the database
    const authenticatedUser = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!authenticatedUser) {
      return res.status(401).json({ error: 'Authenticated user not found' });
    }

    const existing = await prisma.repo.findFirst({
      where: { userId: req.userId!, name: repoName }
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Repo with this name already exists' });
    }
    
    const repo = await prisma.repo.create({
      data: {
        name: repoName,
        gitUrl,
        defaultBranch: 'main',
        userId: req.userId!
      }
    });
    
    res.status(201).json({ repo });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to create repo',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const repos = await prisma.repo.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ repos });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch repos' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const repo = await prisma.repo.findFirst({
      where: { 
        id: req.params.id,
        userId: req.userId!
      }
    });
    
    if (!repo) {
      return res.status(404).json({ error: 'Repo not found' });
    }
    
    res.json({ repo });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch repo' });
  }
});

router.get('/:id/branches', async (req: AuthRequest, res: Response) => {
  try {
    const repo = await prisma.repo.findFirst({
      where: { 
        id: req.params.id,
        userId: req.userId!
      }
    });
    
    if (!repo) {
      return res.status(404).json({ error: 'Repo not found' });
    }
    
    const branches = await getBranches(repo.gitUrl);
    res.json({ branches });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch branches',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/:id/files', async (req: AuthRequest, res: Response) => {
  try {
    const { branch } = req.query;
    
    const repo = await prisma.repo.findFirst({
      where: { 
        id: req.params.id,
        userId: req.userId!
      }
    });
    
    if (!repo) {
      return res.status(404).json({ error: 'Repo not found' });
    }
    
    const files = await getFileTree(repo.gitUrl, (branch as string) || repo.defaultBranch);
    res.json({ files });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch files',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/:id/file-content', async (req: AuthRequest, res: Response) => {
  try {
    const { path, branch } = req.query;

    const repo = await prisma.repo.findFirst({
      where: { 
        id: req.params.id,
        userId: req.userId!
      }
    });

    if (!repo) {
      return res.status(404).json({ error: 'Repo not found' });
    }

    if (!path) {
      // No path provided -> try to find README automatically
      try {
        const readme = await findReadme(repo.gitUrl, (branch as string) || repo.defaultBranch);
        return res.json({ content: readme.content, path: readme.path });
      } catch (err) {
        return res.status(404).json({ error: 'README not found' });
      }
    }
    
    try {
      const content = await readFile(repo.gitUrl, path as string, (branch as string) || repo.defaultBranch);
      return res.json({ content, path });
    } catch (err) {
      // If the specific path wasn't found, fall back to README lookup for a better UX
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('Not Found') || msg.includes('File not found') || msg.includes('404')) {
        try {
          const readme = await findReadme(repo.gitUrl, (branch as string) || repo.defaultBranch);
          return res.json({ content: readme.content, path: readme.path });
        } catch (_) {
          return res.status(404).json({ error: 'File not found' });
        }
      }
      throw err;
    }
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to read file',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const repo = await prisma.repo.findFirst({
      where: { 
        id: req.params.id,
        userId: req.userId!
      }
    });
    
    if (!repo) {
      return res.status(404).json({ error: 'Repo not found' });
    }
    
    await prisma.repo.delete({ where: { id: repo.id } });
    
    res.json({ message: 'Repo deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete repo' });
  }
});

export default router;
