import { Octokit } from '@octokit/rest';
import { withPrisma } from '../prisma';

interface Payload {
  repoId: string;
  gitUrl: string;
}

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export default async function populateRepoMetadata(payload: Payload) {
  const { repoId, gitUrl } = payload;

  return withPrisma(async (prisma) => {
    // parse owner/repo from gitUrl (simple)
    const cleaned = gitUrl.replace(/\.git$/, '').replace(/\/$/, '');
    const parts = cleaned.split('/').slice(-2);
    if (parts.length < 2) {
      throw new Error('Invalid gitUrl');
    }
    const owner = parts[0];
    const repo = parts[1];

    const resp = await octokit.repos.get({ owner, repo });
    const data = resp.data;

    await prisma.repo.update({
      where: { id: repoId },
      data: {
        defaultBranch: data.default_branch,
        ...(data.description ? { description: data.description } : {}),
        ...(typeof data.stargazers_count === 'number' ? { stars: data.stargazers_count } : {}),
        ...(data.language ? { language: data.language } : {})
      }
    });
  });
}
