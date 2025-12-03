# Worker Dockerfile
FROM node:20-alpine

# Install Docker CLI and git for container management and cloning repos
RUN apk add --no-cache docker-cli git

WORKDIR /app

# Install ALL dependencies (including devDependencies for build)
COPY package*.json ./
RUN npm ci

# Copy prisma schema and generate client
COPY prisma ./prisma
RUN ./node_modules/.bin/prisma generate

# Copy source files and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Remove devDependencies after build
RUN npm prune --production

# Create workspace directory
RUN mkdir -p /app/workspaces /app/logs

# Start the worker
CMD ["node", "dist/index.js"]
