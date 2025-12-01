import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_URL || '';
console.log('Node Version:', process.version);
console.log('DATABASE_URL:', url.replace(/:[^:@]+@/, ':****@')); // Mask password

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  console.log('Attempting to connect to DB...');
  try {
    await prisma.$connect();
    console.log('Connected successfully!');
    const count = await prisma.user.count();
    console.log(`User count: ${count}`);
  } catch (e) {
    console.error('Connection failed:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
