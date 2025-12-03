import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { hashPassword, comparePassword, generateToken } from '../lib/auth';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { Octokit } from '@octokit/rest';
import crypto from 'crypto';

// Read env vars at runtime via getters to ensure they're available after dotenv.config()
const getGithubClientId = () => process.env.GITHUB_CLIENT_ID;
const getGithubClientSecret = () => process.env.GITHUB_CLIENT_SECRET;
const getOAuthRedirectUri = () => process.env.GITHUB_OAUTH_REDIRECT || 'http://localhost:3000/api/auth/github/callback';

const router = Router();

router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash, name },
      select: { id: true, email: true, name: true, createdAt: true }
    });
    
    const token = generateToken({ userId: user.id, email: user.email });
    
    res.status(201).json({ user, token });
  } catch (error) {
    res.status(500).json({ error: 'Signup failed' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = generateToken({ userId: user.id, email: user.email });
    
    res.json({ 
      user: { id: user.id, email: user.email, name: user.name },
      token 
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, avatar: true, createdAt: true }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Start GitHub OAuth flow
router.get('/github', (req: Request, res: Response) => {
  const clientId = getGithubClientId();
  const redirectUri = getOAuthRedirectUri();
  if (!clientId) return res.status(500).json({ error: 'OAuth not configured' });
  const state = crypto.randomBytes(8).toString('hex');
  // Request repo scope so the app can create commits on behalf of the user when needed.
  // For public-repo-only use cases consider 'public_repo' instead of 'repo'.
  const scope = encodeURIComponent('user:email repo');
  const url = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}&scope=${scope}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  // NOTE: in production you'd store state in user session to verify on callback
  res.redirect(url);
});

// OAuth callback
router.get('/github/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    const clientId = getGithubClientId();
    const clientSecret = getGithubClientSecret();
    const redirectUri = getOAuthRedirectUri();
    if (!code || !clientId || !clientSecret) {
      return res.status(400).json({ error: 'Missing code or OAuth not configured' });
    }

    // Exchange code for access token
    const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri })
    });
    const tokenJson = await tokenResp.json();
    const accessToken = tokenJson.access_token;
    if (!accessToken) return res.status(400).json({ error: 'Failed to obtain access token' });

    const octokit = new Octokit({ auth: accessToken });
    const userResp = await octokit.request('GET /user');
    const gh = userResp.data as any;

    // get primary email if possible
    let email = gh.email;
    try {
      const emailsResp = await octokit.request('GET /user/emails');
      const emails = emailsResp.data as any[];
      const primary = emails.find(e => e.primary) || emails.find(e => e.verified) || emails[0];
      if (primary && primary.email) email = primary.email;
    } catch (_) {
      // ignore
    }

    // create or update user
    const githubId = String(gh.id);
    const name = gh.name || gh.login;
    const avatar = gh.avatar_url;

    // Persist or link user and store the GitHub access token so we can act on
    // the user's behalf (create commits) in future API calls.
    let user = await prisma.user.findUnique({ where: { githubId } });
    if (!user) {
      // if email exists, try to link by email
      if (email) {
        const byEmail = await prisma.user.findUnique({ where: { email } });
        if (byEmail) {
          user = await prisma.user.update({ where: { id: byEmail.id }, data: { githubId, avatar, name, githubAccessToken: accessToken } });
        }
      }
    }

    if (!user) {
      // create full user record and save token
      user = await prisma.user.create({ data: { githubId, email: email || undefined, name, avatar, githubAccessToken: accessToken } });
    } else {
      // Ensure token is up to date on the existing user record
      await prisma.user.update({ where: { id: user.id }, data: { githubAccessToken: accessToken, avatar, name } });
      // refresh user object
      user = await prisma.user.findUnique({ where: { id: user.id } }) as any;
    }

    // ensure user exists now
    if (!user) {
      return res.status(500).json({ error: 'Failed to create or link user' });
    }

    // create refresh token
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Use dynamic access to avoid type mismatches if Prisma client typings are stale
    await (prisma as any).refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt } });

    const jwtToken = generateToken({ userId: user.id, email: user.email || '' });

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}?token=${jwtToken}`);
  } catch (error) {
    res.status(500).json({ error: 'OAuth failed', details: error instanceof Error ? error.message : String(error) });
  }
});

// Refresh access token using refresh token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });

    const stored = await (prisma as any).refreshToken.findUnique({ where: { token: refreshToken }, include: { user: true } });
    if (!stored) return res.status(401).json({ error: 'Invalid refresh token' });
    if (stored.expiresAt < new Date()) {
      await (prisma as any).refreshToken.delete({ where: { id: stored.id } });
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    // rotate token
    await (prisma as any).refreshToken.delete({ where: { id: stored.id } });
    const newToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await (prisma as any).refreshToken.create({ data: { token: newToken, userId: stored.userId, expiresAt } });

    const jwtToken = generateToken({ userId: stored.user.id, email: stored.user.email || '' });
    res.json({ token: jwtToken, refreshToken: newToken });
  } catch (error) {
    res.status(500).json({ error: 'Refresh failed' });
  }
});

export default router;
