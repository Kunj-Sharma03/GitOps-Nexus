# API Dockerfile
FROM node:20-alpine

# Install Docker CLI for terminal/sandbox features
RUN apk add --no-cache docker-cli

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

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the server
CMD ["node", "dist/index.js"]
