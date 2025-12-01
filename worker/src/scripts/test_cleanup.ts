import 'dotenv/config';
import Docker from 'dockerode';
import prisma from '../prisma';
import sessionCleanup from '../jobs/sessionCleanup';

const docker = new Docker();

async function main() {
  console.log('🧪 Starting Cleanup Smoke Test...');

  // 1. Find a user
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error('❌ No user found in DB. Cannot create session.');
    process.exit(1);
  }
  console.log(`👤 Using user: ${user.email} (${user.id})`);

  // 2. Create an expired session
  const expiresAt = new Date(Date.now() - 1000 * 60); // 1 minute ago
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      status: 'RUNNING',
      expiresAt: expiresAt,
    },
  });
  console.log(`📅 Created expired session: ${session.id}`);

  // 3. Create a dummy container
  const containerName = `session-${session.id}`;
  try {
    const container = await docker.createContainer({
      Image: 'node:18-alpine',
      Cmd: ['tail', '-f', '/dev/null'],
      name: containerName,
      Labels: {
        'gitops.session.id': session.id,
      }
    });
    await container.start();
    console.log(`🐳 Created and started container: ${containerName}`);
    
    // Update session with container ID
    await prisma.session.update({
        where: { id: session.id },
        data: { containerId: container.id }
    });

  } catch (error) {
    console.error('❌ Failed to create container:', error);
    // Cleanup DB record
    await prisma.session.delete({ where: { id: session.id } });
    process.exit(1);
  }

  // 4. Run Cleanup
  console.log('🧹 Running sessionCleanup()...');
  await sessionCleanup();

  // 5. Verify
  const updatedSession = await prisma.session.findUnique({
    where: { id: session.id },
  });

  if (updatedSession?.status === 'EXPIRED') {
    console.log('✅ Session status updated to EXPIRED');
  } else {
    console.error(`❌ Session status is ${updatedSession?.status}, expected EXPIRED`);
  }

  try {
    const container = docker.getContainer(containerName);
    await container.inspect();
    console.error('❌ Container still exists!');
  } catch (error: any) {
    if (error.statusCode === 404) {
      console.log('✅ Container successfully removed');
    } else {
      console.error('❓ Error checking container:', error);
    }
  }

  // Cleanup DB
  await prisma.session.delete({ where: { id: session.id } });
  console.log('✨ Test Complete');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
