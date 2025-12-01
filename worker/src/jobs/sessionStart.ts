import fs from 'fs-extra';
import path from 'path';
import simpleGit from 'simple-git';
import Docker from 'dockerode';
import { withPrisma } from '../prisma';

const docker = new Docker();

interface SessionStartJobData {
  sessionId: string;
}

export default async function sessionStart(data: SessionStartJobData) {
  const { sessionId } = data;
  const workDir = path.resolve(__dirname, '..', '..', 'workspaces', `session-${sessionId}`);

  return withPrisma(async (prisma) => {
    console.log(`Starting session ${sessionId}...`);
    
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
      // 2. Clone Repo (if repoId is present)
      await fs.ensureDir(workDir);
      
      if (session.repoId) {
        const repo = await prisma.repo.findUnique({ where: { id: session.repoId } });
        if (repo) {
          let gitUrl = repo.gitUrl;
          console.log(`Cloning ${gitUrl} to ${workDir}`);
          await simpleGit().clone(gitUrl, workDir);
          
          if (repo.defaultBranch) {
            await simpleGit(workDir).checkout(repo.defaultBranch);
          }
        } else {
          console.warn(`Repo ${session.repoId} not found, creating empty workspace.`);
        }
      } else {
        console.log(`Creating empty workspace at ${workDir}`);
      }

      // 3. Start Docker Container
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
        Image: 'node:18-alpine',
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
        }
      });

      await container.start();
      const containerInfo = await container.inspect();

      // 4. Update Session
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          status: 'RUNNING',
          containerId: containerInfo.Id,
        },
      });

      console.log(`Session ${sessionId} started. Container: ${containerInfo.Id}`);

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
