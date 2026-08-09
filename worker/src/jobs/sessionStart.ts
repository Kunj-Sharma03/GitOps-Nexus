import fs from 'fs-extra';
import path from 'path';
import simpleGit from 'simple-git';
import Docker from 'dockerode';
import { withPrisma } from '../prisma';
import { k8sProvider } from '../services/k8sProvider';

const docker = new Docker();

interface SessionStartJobData {
  sessionId: string;
}

export default async function sessionStart(data: SessionStartJobData) {
  const { sessionId } = data;
  const runtime = (process.env.SANDBOX_RUNTIME || 'docker').toLowerCase();

  return withPrisma(async (prisma) => {
    console.log(`Starting session ${sessionId} using runtime: ${runtime}...`);
    
    // 1. Fetch Session
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== 'STARTING') {
      console.log(`Session ${sessionId} is not in STARTING state (${session.status}). Skipping.`);
      return;
    }

    try {
      let repoGitUrl: string | null = null;
      let defaultBranch = 'main';

      if (session.repoId) {
        const repo = await prisma.repo.findUnique({ where: { id: session.repoId } });
        if (repo) {
          repoGitUrl = repo.gitUrl;
          defaultBranch = repo.defaultBranch || 'main';
        }
      }

      // =======================================================================
      // KUBERNETES RUNTIME
      // =======================================================================
      if (runtime === 'kubernetes') {
        const podInfo = await k8sProvider.startPodSession({
          sessionId,
          userId: session.userId,
          repoGitUrl,
          defaultBranch,
        });

        await prisma.session.update({
          where: { id: sessionId },
          data: {
            status: 'RUNNING',
            containerId: podInfo.podName,
          },
        });

        console.log(`[K8s] Session ${sessionId} running in Pod: ${podInfo.podName}`);
        return;
      }

      // =======================================================================
      // DOCKER RUNTIME (Default / Backward Compatible)
      // =======================================================================
      const workDir = path.resolve(__dirname, '..', '..', 'workspaces', `session-${sessionId}`);
      await fs.ensureDir(workDir);
      
      if (repoGitUrl) {
        console.log(`Cloning ${repoGitUrl} to ${workDir}`);
        await simpleGit().clone(repoGitUrl, workDir);
        await simpleGit(workDir).checkout(defaultBranch);
      } else {
        console.log(`Creating empty workspace at ${workDir}`);
      }

      const containerName = `session-${sessionId}`;
      
      // Check if container already exists and remove it
      const existingContainer = docker.getContainer(containerName);
      try {
        await existingContainer.inspect();
        console.log(`Removing existing container ${containerName}`);
        await existingContainer.remove({ force: true });
      } catch (e) {
        // Container doesn't exist, ignore
      }

      const container = await docker.createContainer({
        Image: process.env.SANDBOX_IMAGE || 'gitops-sandbox:latest',
        Cmd: ['tail', '-f', '/dev/null'],
        name: containerName,
        User: 'node',
        HostConfig: {
          Binds: [`${workDir}:/app`],
          Memory: 512 * 1024 * 1024,
          NanoCpus: 500000000,
          CapDrop: ['ALL'],
          SecurityOpt: ['no-new-privileges'],
        },
        WorkingDir: '/app',
        Labels: {
          'gitops.session.id': sessionId,
          'gitops.user.id': session.userId,
        },
      });

      await container.start();
      const containerInfo = await container.inspect();

      // Update Session in database
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          status: 'RUNNING',
          containerId: containerInfo.Id,
        },
      });

      console.log(`[Docker] Session ${sessionId} started. Container: ${containerInfo.Id}`);

    } catch (error: any) {
      console.error(`Failed to start session ${sessionId}:`, error.message);
      
      await prisma.session.update({
        where: { id: sessionId },
        data: { status: 'STOPPED' },
      });
      
      throw error;
    }
  });
}
