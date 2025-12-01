import Docker from 'dockerode';
import prisma from '../prisma';

const docker = new Docker();

export default async function sessionCleanup() {
  try {
    const now = new Date();
    
    // Find expired sessions that are still active
    const expiredSessions = await prisma.session.findMany({
      where: {
        status: { in: ['STARTING', 'RUNNING'] },
        expiresAt: { lt: now },
      },
    });

    if (expiredSessions.length === 0) return;

    console.log(`Found ${expiredSessions.length} expired sessions. Cleaning up...`);

    for (const session of expiredSessions) {
      try {
        console.log(`Cleaning up expired session ${session.id}...`);
        
        // 1. Stop/Remove Docker Container
        if (session.containerId) {
            try {
                const container = docker.getContainer(session.containerId);
                const info = await container.inspect();
                if (info.State.Running) {
                    await container.stop();
                }
                await container.remove({ force: true });
                console.log(`Container ${session.containerId} removed.`);
            } catch (e: any) {
                if (e.statusCode === 404) {
                    console.log(`Container ${session.containerId} not found (already removed).`);
                } else {
                    console.error(`Error removing container for session ${session.id}:`, e);
                }
            }
        } else {
            // Try to find by name if containerId is missing but we know the pattern
            try {
                const containerName = `session-${session.id}`;
                const container = docker.getContainer(containerName);
                await container.remove({ force: true });
                console.log(`Container ${containerName} removed by name.`);
            } catch (e) {
                // ignore
            }
        }

        // 2. Update DB Status
        await prisma.session.update({
          where: { id: session.id },
          data: { status: 'EXPIRED' },
        });
        
        console.log(`Session ${session.id} marked as EXPIRED.`);

      } catch (err) {
        console.error(`Failed to cleanup session ${session.id}:`, err);
      }
    }
  } catch (error) {
    console.error('Error in sessionCleanup job:', error);
  }
}
