
import 'dotenv/config';
import prisma from '../src/lib/prisma';
import { generateToken } from '../src/lib/auth';

async function main() {
  // Try to find a user
  let user = await prisma.user.findFirst();

  if (!user) {
    console.log('No user found, creating test user...');
    user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'placeholder', // We don't need a real password for this test
      },
    });
  }

  console.log(`User found: ${user.email} (${user.id})`);

  const token = generateToken({ userId: user.id, email: user.email });
  console.log('\nHere is your valid JWT:');
  console.log(token);
  
  // Also print the export command for convenience
  console.log(`\nexport JWT="${token}"`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
