/**
 * Terminal Handler
 * 
 * Manages WebSocket connections to Docker container terminals
 * using docker exec with pseudo-TTY
 */

import { Server, Socket } from 'socket.io';
import Dockerode from 'dockerode';
import jwt from 'jsonwebtoken';
import prisma from './prisma';

const docker = new Dockerode();

interface TerminalSession {
  exec: Dockerode.Exec;
  stream: NodeJS.ReadWriteStream;
  containerId: string;
  sessionId: string;
}

const activeSessions = new Map<string, TerminalSession>();

export function setupTerminalHandler(io: Server) {
  // Create a namespace for terminal connections
  const terminalNs = io.of('/terminal');

  terminalNs.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token as string, process.env.JWT_SECRET!) as { userId: string };
      (socket as any).userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  terminalNs.on('connection', (socket: Socket) => {
    console.log(`Terminal client connected: ${socket.id}`);
    const userId = (socket as any).userId;

    socket.on('start', async (data: { sessionId: string; cols?: number; rows?: number }) => {
      const { sessionId, cols = 80, rows = 24 } = data;

      try {
        // Verify session belongs to user
        const session = await prisma.session.findUnique({
          where: { id: sessionId },
        });

        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        if (session.userId !== userId) {
          socket.emit('error', { message: 'Unauthorized' });
          return;
        }

        if (session.status !== 'RUNNING') {
          socket.emit('error', { message: 'Session is not running' });
          return;
        }

        if (!session.containerId) {
          socket.emit('error', { message: 'No container associated with session' });
          return;
        }

        // Check if container exists and is running
        const container = docker.getContainer(session.containerId);
        const containerInfo = await container.inspect();
        
        if (!containerInfo.State.Running) {
          socket.emit('error', { message: 'Container is not running' });
          return;
        }

        // Create exec instance
        const exec = await container.exec({
          Cmd: ['/bin/sh'],
          AttachStdin: true,
          AttachStdout: true,
          AttachStderr: true,
          Tty: true,
          Env: ['TERM=xterm-256color'],
        });

        // Start the exec with a TTY
        const stream = await exec.start({
          hijack: true,
          stdin: true,
          Tty: true,
        });

        // Store the session
        const termKey = `${socket.id}:${sessionId}`;
        activeSessions.set(termKey, {
          exec,
          stream,
          containerId: session.containerId,
          sessionId,
        });

        // Forward output to client
        stream.on('data', (chunk: Buffer) => {
          socket.emit('output', chunk.toString('utf-8'));
        });

        stream.on('end', () => {
          socket.emit('exit');
          activeSessions.delete(termKey);
        });

        // Resize terminal
        await exec.resize({ h: rows, w: cols });

        socket.emit('ready');
        console.log(`Terminal started for session ${sessionId} (container: ${session.containerId})`);

      } catch (err: any) {
        console.error('Failed to start terminal:', err);
        socket.emit('error', { message: err.message || 'Failed to start terminal' });
      }
    });

    socket.on('input', (data: { sessionId: string; data: string }) => {
      const termKey = `${socket.id}:${data.sessionId}`;
      const session = activeSessions.get(termKey);
      
      if (session?.stream) {
        session.stream.write(data.data);
      }
    });

    socket.on('resize', async (data: { sessionId: string; cols: number; rows: number }) => {
      const termKey = `${socket.id}:${data.sessionId}`;
      const session = activeSessions.get(termKey);
      
      if (session?.exec) {
        try {
          await session.exec.resize({ h: data.rows, w: data.cols });
        } catch (err) {
          console.error('Failed to resize terminal:', err);
        }
      }
    });

    socket.on('disconnect', () => {
      // Clean up all terminal sessions for this socket
      for (const [key, session] of activeSessions.entries()) {
        if (key.startsWith(socket.id)) {
          try {
            session.stream.end();
          } catch (err) {
            // Ignore cleanup errors
          }
          activeSessions.delete(key);
        }
      }
      console.log(`Terminal client disconnected: ${socket.id}`);
    });
  });
}
