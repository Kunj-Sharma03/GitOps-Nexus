/**
 * Prisma Database Client
 * 
 * Single instance of Prisma Client to use across the app.
 * Import this file whenever you need to query the database.
 */

import { PrismaClient } from '@prisma/client';

// Create Prisma Client instance
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'], // Logs SQL queries (useful for learning!)
});

// Graceful shutdown - close database connections when app stops
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
