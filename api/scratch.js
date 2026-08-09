const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-12345';
const prisma = new PrismaClient();

async function main() {
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        githubId: 'local-dev',
        username: 'localdev',
        avatarUrl: 'https://github.com/github.png',
        accessToken: 'fake-token'
      }
    });
  }
  const token = jwt.sign({ userId: user.id }, secret, { expiresIn: '7d' });
  console.log('MAGIC_LINK: http://localhost:5173/?token=' + token);
}
main().catch(console.error).finally(() => prisma.$disconnect());
