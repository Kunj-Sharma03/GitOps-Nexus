/**
 * Prisma Database Client
 * 
 * Single instance of Prisma Client to use across the app.
 * Import this file whenever you need to query the database.
 */

import { PrismaClient } from '@prisma/client';

// Create Prisma Client instance
// Only log errors in production, add 'query' for debugging SQL
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// Graceful shutdown - close database connections when app stops
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
