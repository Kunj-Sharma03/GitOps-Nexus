import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getBranches, getFileTree, readFile, findReadme, parseGitHubUrl, compareCommits, createOrUpdateFile } from '../lib/git';
import { cacheDelPrefix, getCacheStats, invalidateRepoCache } from '../lib/cache';

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
    // Invalidate any cached trees or file contents for this repo
    try {
      const parsed = parseGitHubUrl(gitUrl);
      // invalidate cache for this repo (tree, files, readme)
      invalidateRepoCache(parsed.owner, parsed.repo);
    } catch (e) {
      // ignore cache invalidation errors
    }

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

// GET /api/repos/cache/stats - returns in-memory cache stats (hits/misses/keys)
router.get('/cache/stats', async (_req: AuthRequest, res: Response) => {
  try {
    const stats = getCacheStats();
    res.json({ stats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

// TODO: When adding endpoints that mutate repo contents (commits/writes),
// call `invalidateRepoCache(owner, repo)` after the commit completes so stale
// file trees and file contents are not served from cache.

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

// GET /:id/diff?base=...&head=... -> compare two refs/commits
router.get('/:id/diff', async (req: AuthRequest, res: Response) => {
  try {
    const { base, head } = req.query;
    if (!base || !head) return res.status(400).json({ error: 'base and head query parameters are required' });

    const repo = await prisma.repo.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!repo) return res.status(404).json({ error: 'Repo not found' });

    const diff = await compareCommits(repo.gitUrl, base as string, head as string);
    return res.json({ diff });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to compute diff', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// POST /:id/commit -> create or update a file on given branch
router.post('/:id/commit', async (req: AuthRequest, res: Response) => {
  try {
    const { path, content, branch, message } = req.body;
    if (!path || typeof content !== 'string') return res.status(400).json({ error: 'path and content are required in body' });

    const repo = await prisma.repo.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!repo) return res.status(404).json({ error: 'Repo not found' });

    // Safety: limit file size to 200KB
    const maxSize = Number(process.env.COMMIT_MAX_BYTES || 200 * 1024);
    if (Buffer.byteLength(content, 'utf8') > maxSize) return res.status(400).json({ error: 'File too large' });

    // Use the user's GitHub access token if available so commits are performed as the user
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    const token = user?.githubAccessToken || undefined;

    const result = await createOrUpdateFile(repo.gitUrl, path, content, branch || repo.defaultBranch, message || `Update ${path} via API`, { name: req.userEmail || 'dev', email: req.userEmail || 'dev@example.com' }, token);

    // Invalidate caches for this repo so subsequent reads return fresh data
    try {
      const parsed = parseGitHubUrl(repo.gitUrl);
      cacheDelPrefix(`tree:${parsed.owner}/${parsed.repo}:`);
      cacheDelPrefix(`file:${parsed.owner}/${parsed.repo}:`);
      cacheDelPrefix(`readme:${parsed.owner}/${parsed.repo}:`);
    } catch (e) {
      // ignore cache errors
    }

    return res.json({ result });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create/update file', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// POST /:id/refresh-cache -> force invalidate cached trees/files/readme for a repo
router.post('/:id/refresh-cache', async (req: AuthRequest, res: Response) => {
  try {
    const repo = await prisma.repo.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!repo) return res.status(404).json({ error: 'Repo not found' });
    try {
      const parsed = parseGitHubUrl(repo.gitUrl);
      cacheDelPrefix(`tree:${parsed.owner}/${parsed.repo}:`);
      cacheDelPrefix(`file:${parsed.owner}/${parsed.repo}:`);
      cacheDelPrefix(`readme:${parsed.owner}/${parsed.repo}:`);
    } catch (e) {
      // ignore any cache errors
    }
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: 'Failed to refresh cache' });
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
    try {
      const parsed = parseGitHubUrl(repo.gitUrl);
      cacheDelPrefix(`tree:${parsed.owner}/${parsed.repo}:`);
      cacheDelPrefix(`file:${parsed.owner}/${parsed.repo}:`);
      cacheDelPrefix(`readme:${parsed.owner}/${parsed.repo}:`);
    } catch (e) {
      // ignore
    }
    
    res.json({ message: 'Repo deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete repo' });
  }
});

export default router;
