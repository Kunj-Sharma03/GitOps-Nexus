import Docker from 'dockerode';
import fs from 'fs-extra';
import path from 'path';

const docker = new Docker();

interface SessionStopPayload {
  sessionId: string;
  containerId?: string | null;
}

export default async function sessionStop(payload: SessionStopPayload) {
  const { sessionId, containerId } = payload;
  
  console.log(`Stopping session ${sessionId}...`);
  
  // 1. Stop and remove the Docker container
  if (containerId) {
    try {
      const container = docker.getContainer(containerId);
      const info = await container.inspect().catch(() => null);
      
      if (info) {
        if (info.State.Running) {
          console.log(`Stopping container ${containerId}...`);
          await container.stop({ t: 5 }); // 5 second timeout
        }
        console.log(`Removing container ${containerId}...`);
        await container.remove({ force: true });
        console.log(`Container ${containerId} removed.`);
      } else {
        console.log(`Container ${containerId} not found (already removed).`);
      }
    } catch (err: any) {
      if (err.statusCode === 404) {
        console.log(`Container ${containerId} already gone.`);
      } else {
        console.error(`Error stopping container ${containerId}:`, err.message);
      }
    }
  } else {
    // Try to find by name if containerId is missing
    const containerName = `session-${sessionId}`;
    try {
      const container = docker.getContainer(containerName);
      const info = await container.inspect().catch(() => null);
      
      if (info) {
        if (info.State.Running) {
          await container.stop({ t: 5 });
        }
        await container.remove({ force: true });
        console.log(`Container ${containerName} removed by name.`);
      }
    } catch (err) {
      // Container doesn't exist, that's fine
    }
  }
  
  // 2. Clean up workspace directory
  const workspacePath = path.join(__dirname, '..', '..', 'workspaces', `session-${sessionId}`);
  if (await fs.pathExists(workspacePath)) {
    console.log(`Cleaning up workspace ${workspacePath}...`);
    await fs.remove(workspacePath);
    console.log(`Workspace cleaned up.`);
  }
  
  console.log(`Session ${sessionId} stopped and cleaned up.`);
}
