import Docker from 'dockerode';
import { withPrisma } from '../prisma';
import { k8sProvider } from '../services/k8sProvider';

const docker = new Docker();

export default async function sessionCleanup() {
  const runtime = (process.env.SANDBOX_RUNTIME || 'docker').toLowerCase();

  return withPrisma(async (prisma) => {
    const now = new Date();
    
    // Find expired sessions that are still active
    const expiredSessions = await prisma.session.findMany({
      where: {
        status: { in: ['STARTING', 'RUNNING'] },
        expiresAt: { lt: now },
      },
    });

    if (expiredSessions.length === 0) {
      return; // Nothing to clean up
    }

    console.log(`Found ${expiredSessions.length} expired sessions. Cleaning up (runtime: ${runtime})...`);

    // =========================================================================
    // KUBERNETES RUNTIME CLEANUP
    // =========================================================================
    if (runtime === 'kubernetes') {
      const activeSessions = await prisma.session.findMany({
        where: { status: 'RUNNING' },
        select: { id: true },
      });
      const activeSet = new Set(activeSessions.map((s) => s.id));

      for (const session of expiredSessions) {
        try {
          await k8sProvider.stopPodSession(session.id);
          await prisma.session.update({
            where: { id: session.id },
            data: { status: 'EXPIRED' },
          });
          console.log(`[K8s] Expired session ${session.id} marked as EXPIRED.`);
        } catch (err: any) {
          console.error(`[K8s] Failed to clean up session ${session.id}:`, err.message);
        }
      }

      await k8sProvider.cleanupExpiredPods(activeSet);
      return;
    }

    // =========================================================================
    // DOCKER RUNTIME CLEANUP (Default / Backward Compatible)
    // =========================================================================
    for (const session of expiredSessions) {
      try {
        console.log(`Cleaning up expired session ${session.id}...`);
        
        // 1. Stop/Remove Docker Container
        if (session.containerId) {
          try {
            const container = docker.getContainer(session.containerId);
            try {
              const info = await container.inspect();
              if (info.State.Running) {
                await container.stop();
              }
              await container.remove({ force: true });
              console.log(`Container ${session.containerId} removed.`);
            } catch (inspectErr: any) {
              if (inspectErr.statusCode === 404) {
                console.log(`Container ${session.containerId} already gone.`);
              } else {
                throw inspectErr;
              }
            }
          } catch (e: any) {
            console.error(`Error removing container for session ${session.id}:`, e.message);
          }
        } else {
          // Try to find by name if containerId is missing
          try {
            const containerName = `session-${session.id}`;
            const container = docker.getContainer(containerName);
            await container.inspect();
            await container.remove({ force: true });
            console.log(`Container ${containerName} removed by name.`);
          } catch (e) {
            // ignore if not found
          }
        }

        // 2. Update DB Status
        await prisma.session.update({
          where: { id: session.id },
          data: { status: 'EXPIRED' },
        });
        
        console.log(`Session ${session.id} marked as EXPIRED.`);

      } catch (err: any) {
        console.error(`Failed to cleanup session ${session.id}:`, err.message);
      }
    }
  });
}
