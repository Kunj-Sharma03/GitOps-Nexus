# Worker Dockerfile
FROM node:20-alpine

# Install Docker CLI for container management
RUN apk add --no-cache docker-cli

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy built files
COPY dist ./dist

# Create workspace directory
RUN mkdir -p /app/workspaces /app/logs

# Start the worker
CMD ["node", "dist/index.js"]
