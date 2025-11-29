/**
 * API Server - Entry Point
 */

import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import IORedis from 'ioredis';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './lib/prisma';
import authRoutes from './routes/auth';
import repoRoutes from './routes/repos';
import jobsRoutes from './routes/jobs';
import debugRoutes from './routes/debug';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow all for dev
    methods: ['GET', 'POST']
  }
});

// Redis Subscriber for Logs
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redisSub = new IORedis(redisUrl, { maxRetriesPerRequest: null });

redisSub.subscribe('job-logs', (err) => {
  if (err) console.error('Failed to subscribe to job-logs:', err);
  else console.log('Subscribed to job-logs channel');
});

redisSub.on('message', (channel, message) => {
  if (channel === 'job-logs') {
    try {
      const { jobId, line } = JSON.parse(message);
      io.to(`job:${jobId}`).emit('log', line);
    } catch (e) {
      console.error('Error parsing log message:', e);
    }
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join-job', (jobId) => {
    socket.join(`job:${jobId}`);
    console.log(`Socket ${socket.id} joined job:${jobId}`);
  });

  socket.on('leave-job', (jobId) => {
    socket.leave(`job:${jobId}`);
  });
});

// ========== MIDDLEWARE ==========

// 1. CORS - allows frontend to call this API
app.use(cors());

// 2. Parse JSON bodies
app.use(express.json());

// 3. Request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/repos', repoRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/debug', debugRoutes);

/**
 * Health Check - tells you if the server is alive
 * Try: http://localhost:3000/health
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

/**
 * API Info
 */
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    name: 'GitOps DevTools API',
    version: '1.0.0',
    message: 'Server is running!'
  });
});

/**
 * Echo endpoint - for testing
 * Send POST request with { "message": "hello" }
 */
app.post('/api/echo', (req: Request, res: Response) => {
  const { message } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Missing message field' });
  }
  
  res.json({
    echo: message,
    receivedAt: new Date().toISOString()
  });
});

/**
 * Test Database Connection
 * GET /api/users/count
 * Returns the number of users in database
 */
app.get('/api/users/count', async (_req: Request, res: Response) => {
  try {
    const count = await prisma.user.count();
    res.json({ 
      count,
      message: 'Database connected successfully!' 
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ========== ERROR HANDLERS ==========

// 404 - Route not found
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ========== START SERVER ==========

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   GitOps DevTools API Server          ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');
  console.log(`🚀 Server: http://localhost:${PORT}`);
  console.log(`📊 Health:  http://localhost:${PORT}/health`);
  console.log(`🔌 Socket.IO: enabled`);
  console.log('');
  console.log('Press Ctrl+C to stop');
});

export default app;
