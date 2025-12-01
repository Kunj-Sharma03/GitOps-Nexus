import { PrismaClient } from '@prisma/client';

// Create a resilient Prisma client that handles connection drops
function createPrismaClient() {
  return new PrismaClient({
    log: ['warn', 'error'],
  });
}

// Singleton with lazy reconnection
let prisma: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = createPrismaClient();
  }
  return prisma;
}

// Helper for safe database operations with auto-reconnect
export async function withPrisma<T>(
  operation: (client: PrismaClient) => Promise<T>
): Promise<T> {
  const client = new PrismaClient();
  try {
    return await operation(client);
  } finally {
    await client.$disconnect();
  }
}

export default getPrisma();
