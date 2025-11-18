/**
 * API Server - Entry Point
 * 
 * This is your backend server that will handle:
 * - REST API requests from the frontend
 * - Authentication
 * - Database operations
 * - WebSocket connections (later)
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = express();

// ========== MIDDLEWARE ==========
// Middleware runs BEFORE your routes (like a pipeline)

// 1. CORS - allows frontend to call this API
app.use(cors());

// 2. Parse JSON bodies
app.use(express.json());

// 3. Request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ========== ROUTES ==========

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

app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   GitOps DevTools API Server          ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');
  console.log(`🚀 Server: http://localhost:${PORT}`);
  console.log(`📊 Health:  http://localhost:${PORT}/health`);
  console.log('');
  console.log('Press Ctrl+C to stop');
});

export default app;
