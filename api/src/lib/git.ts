import { Octokit } from '@octokit/rest';
import simpleGit, { SimpleGit } from 'simple-git';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { cacheGetOrMiss, cacheSet } from './cache';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

// Simple retry helper for transient GitHub API errors
async function withRetries<T>(fn: () => Promise<T>, attempts = 3, delay = 500): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      // if it's a client error (4xx) don't retry except for 404 handling elsewhere
      const status = err && err.status ? err.status : null;
      if (status && status >= 400 && status < 500) break;
      // exponential backoff
      await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
    }
  }
  throw lastErr;
}

interface RepoInfo {
  owner: string;
  repo: string;
}

export function parseGitHubUrl(gitUrl: string): RepoInfo {
  // Normalize and support formats like:
  // - https://github.com/owner/repo.git
  // - https://github.com/owner/repo/
  // - git@github.com:owner/repo.git
  // - ssh://git@github.com/owner/repo.git
  if (!gitUrl) throw new Error('Invalid GitHub URL');

  // Strip trailing .git and any trailing slash
  let cleaned = gitUrl.trim();
  if (cleaned.endsWith('.git')) cleaned = cleaned.slice(0, -4);
  if (cleaned.endsWith('/')) cleaned = cleaned.slice(0, -1);

  // Handle SSH scp-like URL: git@github.com:owner/repo
  const scpLike = cleaned.match(/^git@[^:]+:([^/]+)\/(.+)$/);
  if (scpLike) {
    return { owner: scpLike[1], repo: scpLike[2] };
  }

  try {
    const u = new URL(cleaned.startsWith('http') ? cleaned : `https://${cleaned}`);
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const owner = parts[0];
      const repo = parts[1];
      return { owner, repo };
    }
  } catch (e) {
    // fallthrough
  }

  throw new Error('Invalid GitHub URL');
}

export async function getBranches(gitUrl: string): Promise<string[]> {
  try {
    const { owner, repo } = parseGitHubUrl(gitUrl);
    const { data } = await withRetries(() => octokit.repos.listBranches({ owner, repo }));
    return data.map(b => b.name);
  } catch (error) {
    throw new Error(`Failed to get branches: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getFileTree(gitUrl: string, branch: string = 'main'): Promise<any[]> {
  try {
    const { owner, repo } = parseGitHubUrl(gitUrl);
    const cacheKey = `tree:${owner}/${repo}:${branch}`;
    const cacheTtl = Number(process.env.FILE_TREE_CACHE_MS || 120000);
    const cached = cacheGetOrMiss<any[]>(cacheKey);
    if (cached) return cached;
    // Resolve branch commit -> tree sha (retry with repo default branch if requested ref is missing)
    let treeSha: string | undefined;
    try {
      const branchResp = await withRetries(() => octokit.repos.getBranch({ owner, repo, branch }));
      treeSha = branchResp.data.commit.commit.tree.sha;
    } catch (err) {
      // If branch not found, fetch repo default branch and retry
      const repoResp = await withRetries(() => octokit.repos.get({ owner, repo }));
      const defaultBranch = repoResp.data.default_branch;
      const branchResp = await withRetries(() => octokit.repos.getBranch({ owner, repo, branch: defaultBranch }));
      treeSha = branchResp.data.commit.commit.tree.sha;
    }

    const { data } = await withRetries(() => octokit.git.getTree({ owner, repo, tree_sha: treeSha!, recursive: 'true' }));

    const result = data.tree
      .filter((item: any) => item.type === 'blob')
      .map((item: any) => ({ path: item.path, size: item.size, sha: item.sha }));

    cacheSet(cacheKey, result, cacheTtl);
    return result;
  } catch (error) {
    throw new Error(`Failed to get file tree: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function readFile(gitUrl: string, filePath: string, branch: string = 'main'): Promise<string> {
  try {
    const { owner, repo } = parseGitHubUrl(gitUrl);
    const ref = branch || 'main';
    const cacheKey = `file:${owner}/${repo}:${ref}:${filePath}`;
    const cacheTtl = Number(process.env.FILE_CONTENT_CACHE_MS || 60000);
    const cached = cacheGetOrMiss<string>(cacheKey);
    if (cached) return cached;
    // Try the requested ref, fallback to repo default branch if the ref doesn't exist
    try {
      const { data } = await withRetries(() => octokit.repos.getContent({ owner, repo, path: filePath, ref: branch }));
      if ('content' in data) return Buffer.from(data.content, 'base64').toString('utf-8');
      throw new Error('File not found or is a directory');
    } catch (err: any) {
      // If no commit for ref or not found, try default branch
      if (err && err.status === 404) {
        const repoResp = await withRetries(() => octokit.repos.get({ owner, repo }));
        const defaultBranch = repoResp.data.default_branch;
        const { data } = await withRetries(() => octokit.repos.getContent({ owner, repo, path: filePath, ref: defaultBranch }));
        if ('content' in data) {
          const content = Buffer.from(data.content, 'base64').toString('utf-8');
          cacheSet(cacheKey, content, cacheTtl);
          return content;
        }
        throw new Error('File not found or is a directory');
      }
      throw err;
    }
  } catch (error) {
    throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function findReadme(gitUrl: string, branch?: string): Promise<{ path: string; content: string }> {
  const { owner, repo } = parseGitHubUrl(gitUrl);
  const cacheKey = `readme:${owner}/${repo}:${branch || 'default'}`;
  const cacheTtl = Number(process.env.FILE_CONTENT_CACHE_MS || 60000);
  const cached = cacheGetOrMiss<{ path: string; content: string }>(cacheKey);
  if (cached) return cached;

  // Determine branch to use
  let refBranch = branch;
  if (!refBranch) {
    const repoResp = await withRetries(() => octokit.repos.get({ owner, repo }));
    refBranch = repoResp.data.default_branch;
  }

  const candidates = ['README.md', 'readme.md', 'README.MD', 'README'];

  for (const candidate of candidates) {
    try {
      const { data } = await withRetries(() => octokit.repos.getContent({ owner, repo, path: candidate, ref: refBranch }));
      if ('content' in data) {
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        const result = { path: candidate, content };
        cacheSet(cacheKey, result, cacheTtl);
        return result;
      }
    } catch (err) {
      // ignore and try next
    }
  }

  // Try listing root directory and common doc folders to avoid expensive recursive tree calls on large repos
    try {
      const root = await withRetries(() => octokit.repos.getContent({ owner, repo, path: '', ref: refBranch }));
    if (Array.isArray(root.data)) {
      // check root entries for README variants
      const rootReadme = root.data.find((e: any) => e.type === 'file' && e.name.toLowerCase().startsWith('readme'));
      if (rootReadme) {
        const content = await readFile(gitUrl, rootReadme.path, refBranch);
        const result = { path: rootReadme.path, content };
        cacheSet(cacheKey, result, cacheTtl);
        return result;
      }

      // common directories to check
      const commonDirs = ['docs', '.github', 'website', 'examples', 'packages'];
      for (const dir of commonDirs) {
        const dirEntry = root.data.find((e: any) => e.type === 'dir' && e.name.toLowerCase() === dir.replace('.', ''));
        // special-case .github which includes a dot
        const dirExists = root.data.find((e: any) => e.type === 'dir' && e.name === dir) || dirEntry;
        if (dirExists) {
          // try README in that directory
          for (const candidate of candidates) {
            try {
              const p = `${dir}/${candidate}`;
              const { data } = await withRetries(() => octokit.repos.getContent({ owner, repo, path: p, ref: refBranch }));
              if ('content' in data) {
                const content = Buffer.from(data.content, 'base64').toString('utf-8');
                const result = { path: p, content };
                cacheSet(cacheKey, result, cacheTtl);
                return result;
              }
            } catch (_) {
              // ignore
            }
          }

          // If this is a packages directory, iterate first-level subdirs and look for package READMEs (limit to first 20)
          if (dir === 'packages') {
            try {
              const pkgList = await withRetries(() => octokit.repos.getContent({ owner, repo, path: 'packages', ref: refBranch }));
              if (Array.isArray(pkgList.data)) {
                const subs = pkgList.data.filter((e: any) => e.type === 'dir').slice(0, 20);
                for (const sub of subs) {
                  for (const candidate of candidates) {
                    const p = `packages/${sub.name}/${candidate}`;
                    try {
                      const { data } = await withRetries(() => octokit.repos.getContent({ owner, repo, path: p, ref: refBranch }));
                      if ('content' in data) {
                        const content = Buffer.from(data.content, 'base64').toString('utf-8');
                        const result = { path: p, content };
                        cacheSet(cacheKey, result, cacheTtl);
                        return result;
                      }
                    } catch (_) {
                      // ignore
                    }
                  }
                }
              }
            } catch (_) {
              // ignore packages listing errors
            }
          }
        }
      }
    }
  } catch (err) {
    // listing root might fail for very large repos or permissions; fall through to a safer tree fallback
  }

  // Last resort: try the recursive tree search but protect against failures/timeouts
  try {
    const tree = await getFileTree(gitUrl, refBranch);
    const readmeEntry = tree.find((t: any) => t.path.split('/').pop().toLowerCase().startsWith('readme'));
    if (readmeEntry) {
      const content = await readFile(gitUrl, readmeEntry.path, refBranch);
      const result = { path: readmeEntry.path, content };
      // cache the tree-fallback README so subsequent requests are fast
      try { cacheSet(`readme:${owner}/${repo}:${refBranch}`, result, cacheTtl); } catch (_) { }
      return result;
    }
  } catch (err) {
    // ignore; we'll surface a controlled error below
  }

  throw new Error('README not found');
}

export async function getRepoInfo(gitUrl: string) {
  try {
    const { owner, repo } = parseGitHubUrl(gitUrl);
    const { data } = await octokit.repos.get({ owner, repo });
    
    return {
      name: data.name,
      description: data.description,
      defaultBranch: data.default_branch,
      stars: data.stargazers_count,
      language: data.language,
      isPrivate: data.private
    };
  } catch (error) {
    throw new Error(`Failed to get repo info: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function compareCommits(gitUrl: string, base: string, head: string) {
  try {
    const { owner, repo } = parseGitHubUrl(gitUrl);
    const { data } = await withRetries(() => octokit.repos.compareCommits({ owner, repo, base, head }));
    // Return a simplified list of changed files
    const files = (data.files || []).map((f: any) => ({ filename: f.filename, status: f.status, additions: f.additions, deletions: f.deletions, changes: f.changes }));
    return { ahead_by: data.ahead_by, behind_by: data.behind_by, total_commits: data.total_commits, files };
  } catch (error) {
    throw new Error(`Failed to compare commits: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function createOrUpdateFile(gitUrl: string, filePath: string, content: string, branch: string = 'main', message: string = 'Update file', author?: { name?: string; email?: string }, token?: string) {
  try {
    const { owner, repo } = parseGitHubUrl(gitUrl);
    const client = token ? new Octokit({ auth: token }) : octokit;
    const encoded = Buffer.from(content, 'utf8').toString('base64');
    let sha: string | undefined;
    try {
      const existing = await withRetries(() => client.repos.getContent({ owner, repo, path: filePath, ref: branch }));
      if (existing && 'data' in existing && existing.data && (existing.data as any).sha) sha = (existing.data as any).sha;
    } catch (err: any) {
      // not found -> will create
      if (err && err.status && err.status !== 404) throw err;
    }

    const params: any = { owner, repo, path: filePath, message, content: encoded, branch };
    if (sha) params.sha = sha;
    if (author) params.committer = { name: author.name || 'dev', email: author.email || 'dev@example.com' };

    const resp = await withRetries(() => client.repos.createOrUpdateFileContents(params));
    return { content: resp.data.content, commit: resp.data.commit };
  } catch (error) {
    throw new Error(`Failed to create/update file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function cloneRepoTemporary(gitUrl: string): Promise<string> {
  const tempDir = path.join(os.tmpdir(), `repo-${Date.now()}`);
  
  try {
    const git: SimpleGit = simpleGit();
    await git.clone(gitUrl, tempDir, ['--depth=1']);
    return tempDir;
  } catch (error) {
    throw new Error(`Failed to clone repo: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function cleanupTempRepo(localPath: string): Promise<void> {
  try {
    await fs.remove(localPath);
  } catch (error) {
    console.error('Failed to cleanup temp repo:', error);
  }
}
