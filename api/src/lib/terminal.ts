/**
 * Terminal Handler
 * 
 * Manages WebSocket connections to Docker containers or Kubernetes Pods
 * using interactive pseudo-TTY bi-directional streams.
 */

import { Server, Socket } from 'socket.io';
import Dockerode from 'dockerode';
import * as k8s from '@kubernetes/client-node';
import { PassThrough } from 'stream';
import jwt from 'jsonwebtoken';
import prisma from './prisma';

const docker = new Dockerode();

const kc = new k8s.KubeConfig();
try {
  kc.loadFromDefault();
} catch (e: any) {
  console.warn(`[Terminal] KubeConfig load warning: ${e.message}`);
}
const k8sExec = new k8s.Exec(kc);
const k8sNamespace = process.env.K8S_NAMESPACE || 'gitops-sandboxes';

interface TerminalSession {
  streamIn?: NodeJS.WritableStream;
  streamOut?: NodeJS.ReadableStream;
  execDocker?: Dockerode.Exec;
  containerId: string;
  sessionId: string;
  isK8s: boolean;
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
      const runtime = (process.env.SANDBOX_RUNTIME || 'docker').toLowerCase();

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
          socket.emit('error', { message: 'No container or pod associated with session' });
          return;
        }

        const termKey = `${socket.id}:${sessionId}`;

        // =====================================================================
        // KUBERNETES EXEC STREAMING
        // =====================================================================
        if (runtime === 'kubernetes') {
          const podName = session.containerId;
          const stdinStream = new PassThrough();
          const stdoutStream = new PassThrough();
          const stderrStream = new PassThrough();

          stdoutStream.on('data', (chunk: Buffer) => {
            socket.emit('output', chunk.toString('utf-8'));
          });

          stderrStream.on('data', (chunk: Buffer) => {
            socket.emit('output', chunk.toString('utf-8'));
          });

          activeSessions.set(termKey, {
            streamIn: stdinStream,
            streamOut: stdoutStream,
            containerId: podName,
            sessionId,
            isK8s: true,
          });

          try {
            await k8sExec.exec(
              k8sNamespace,
              podName,
              'sandbox',
              ['/bin/sh'],
              stdoutStream,
              stderrStream,
              stdinStream,
              true /* tty */,
              (status: k8s.V1Status) => {
                socket.emit('exit', { status });
                activeSessions.delete(termKey);
              }
            );

            socket.emit('ready');
            console.log(`[K8s] Terminal attached to Pod ${podName} in ${k8sNamespace}`);
            return;
          } catch (k8sErr: any) {
            activeSessions.delete(termKey);
            throw new Error(`Kubernetes Pod Exec failed: ${k8sErr.message}`);
          }
        }

        // =====================================================================
        // DOCKER EXEC STREAMING (Default / Backward Compatible)
        // =====================================================================
        const container = docker.getContainer(session.containerId);
        const containerInfo = await container.inspect();
        
        if (!containerInfo.State.Running) {
          socket.emit('error', { message: 'Container is not running' });
          return;
        }

        const exec = await container.exec({
          Cmd: ['/bin/sh'],
          AttachStdin: true,
          AttachStdout: true,
          AttachStderr: true,
          Tty: true,
          Env: ['TERM=xterm-256color'],
        });

        const stream = await exec.start({
          hijack: true,
          stdin: true,
          Tty: true,
        });

        activeSessions.set(termKey, {
          execDocker: exec,
          streamIn: stream,
          streamOut: stream,
          containerId: session.containerId,
          sessionId,
          isK8s: false,
        });

        stream.on('data', (chunk: Buffer) => {
          socket.emit('output', chunk.toString('utf-8'));
        });

        stream.on('end', () => {
          socket.emit('exit');
          activeSessions.delete(termKey);
        });

        await exec.resize({ h: rows, w: cols });

        socket.emit('ready');
        console.log(`[Docker] Terminal started for session ${sessionId} (container: ${session.containerId})`);

      } catch (err: any) {
        console.error('Failed to start terminal:', err);
        socket.emit('error', { message: err.message || 'Failed to start terminal' });
      }
    });

    socket.on('input', (data: { sessionId: string; data: string }) => {
      const termKey = `${socket.id}:${data.sessionId}`;
      const session = activeSessions.get(termKey);
      
      if (session?.streamIn) {
        session.streamIn.write(data.data);
      }
    });

    socket.on('resize', async (data: { sessionId: string; cols: number; rows: number }) => {
      const termKey = `${socket.id}:${data.sessionId}`;
      const session = activeSessions.get(termKey);
      
      if (!session?.isK8s && session?.execDocker) {
        try {
          await session.execDocker.resize({ h: data.rows, w: data.cols });
        } catch (err) {
          console.error('Failed to resize docker terminal:', err);
        }
      }
    });

    socket.on('disconnect', () => {
      for (const [key, session] of activeSessions.entries()) {
        if (key.startsWith(socket.id)) {
          try {
            if (session.streamIn && typeof (session.streamIn as any).end === 'function') {
              (session.streamIn as any).end();
            }
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
