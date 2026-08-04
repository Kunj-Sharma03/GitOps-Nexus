<p align="center">
  <img src="https://img.shields.io/badge/GitOps-Nexus-22c55e?style=for-the-badge&logo=git&logoColor=white" alt="GitOps Nexus" />
</p>

<h1 align="center">🚀 GitOps Nexus</h1>

<p align="center">
  <strong>Self-Hosted Cloud DevTools Suite</strong>
</p>

<p align="center">
  A lightweight self-hosted developer platform combining a Git repository browser, web editor, CI job runner with real-time logs, and ephemeral Docker sandboxes — designed for personal DevOps, learning, and small team workflows.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/status-Production%20Ready-success.svg?style=flat-square" alt="Status" />
  <img src="https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/React-18+-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Docker-Enabled-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-deployment">Deployment</a> •
  <a href="#-api-reference">API</a>
</p>

---

## 🌟 Live Demo

| Environment | URL |
|-------------|-----|
| **Frontend** | [git-ops-nexus-458p.vercel.app](https://git-ops-nexus-458p.vercel.app) |
| **API** | [kunjdevaws.duckdns.org](https://kunjdevaws.duckdns.org/api/health) |

---

## ✨ Features

### 📂 Repository Management
- **GitHub OAuth Integration** - Connect and import repositories seamlessly
- **Branch Management** - View, switch, and manage branches
- **File Browser** - Navigate repository structure with tree view
- **Commit History** - View detailed commit logs with diffs

### ✏️ Web-Based Code Editor
- **Monaco Editor** - VS Code-quality editing in the browser
- **Syntax Highlighting** - Support for 50+ programming languages
- **Direct Commits** - Edit and commit changes without leaving the browser
- **File Diff Viewer** - Visual comparison of changes

### 🔄 CI/CD Pipeline
- **One-Click Job Execution** - Run lint, test, build, deploy commands
- **Real-Time Logs** - Live streaming via WebSocket (Socket.IO)
- **Docker Isolation** - Each job runs in its own container
- **Job History** - Track all past executions with logs

### 🐳 Ephemeral Sandboxes
- **Interactive Terminals** - Full bash access in browser
- **Isolated Containers** - Secure, ephemeral Docker environments
- **Pre-installed Tools** - Node.js, Git, Vim, and more
- **Auto-Cleanup** - Sessions expire automatically

### 👥 Collaboration
- **Team Management** - Invite collaborators to repositories
- **Role-Based Access** - Owner, Admin, Editor, Viewer roles
- **Ownership Transfer** - Transfer repository ownership

### 🔐 Security
- **JWT Authentication** - Secure token-based auth
- **GitHub OAuth 2.0** - Social login integration
- **Container Isolation** - Non-root, capability-dropped containers
- **Resource Limits** - CPU/Memory constraints on all containers

---

## 🛠️ Tech Stack

<table>
<tr>
<td align="center" width="150">

**Frontend**

</td>
<td>

- ⚛️ React 18 + TypeScript
- ⚡ Vite (Build tool)
- 🎨 Tailwind CSS
- 📝 Monaco Editor
- 🔌 Socket.IO Client
- 🖥️ xterm.js (Terminal)

</td>
</tr>
<tr>
<td align="center">

**Backend**

</td>
<td>

- 🟢 Node.js + Express
- 📘 TypeScript
- 🔐 JWT + bcrypt
- 🔌 Socket.IO
- 📦 Prisma ORM

</td>
</tr>
<tr>
<td align="center">

**Database**

</td>
<td>

- 🐘 PostgreSQL (Supabase)
- 🔴 Redis (BullMQ)

</td>
</tr>
<tr>
<td align="center">

**Infrastructure**

</td>
<td>

- 🐳 Docker & Docker Compose
- 🌐 Nginx (Reverse Proxy)
- 🔒 Let's Encrypt SSL
- ☁️ DigitalOcean Droplet
- ▲ Vercel (Frontend)

</td>
</tr>
</table>

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vercel)                        │
│                    React + Vite + Tailwind CSS                   │
│              Monaco Editor | xterm.js | Socket.IO                │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NGINX REVERSE PROXY                           │
│                 SSL Termination (Let's Encrypt)                  │
│                 kunjdevaws.duckdns.org:443                       │
└──────────────────────────────┬──────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌───────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API SERVER  │    │     WORKER      │    │      REDIS      │
│   (Express)   │◄──►│   (BullMQ)      │◄──►│   (Job Queue)   │
│   Port 3000   │    │   CI/Sandbox    │    │   Port 6379     │
└───────┬───────┘    └────────┬────────┘    └─────────────────┘
        │                     │
        │    ┌────────────────┴────────────────┐
        ▼    ▼                                 ▼
┌───────────────────┐              ┌───────────────────┐
│    POSTGRESQL     │              │  DOCKER ENGINE    │
│    (Supabase)     │              │  - CI Containers  │
│    Cloud Hosted   │              │  - Sandbox Shells │
└───────────────────┘              └───────────────────┘
```

### Data Flow

1. **Authentication**: User logs in via GitHub OAuth → JWT issued
2. **Repository Import**: Git URL submitted → Cloned to server
3. **Code Editing**: Files loaded via API → Edited in Monaco → Committed
4. **CI Jobs**: Job queued in Redis → Worker picks up → Docker executes → Logs streamed
5. **Sandboxes**: Session created → Container spawned → Terminal attached via WebSocket

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+
- **Docker** & Docker Compose
- **PostgreSQL** (or Supabase account)
- **Redis**

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/Kunj-Sharma03/GitOps-Nexus.git
cd GitOps-Nexus

# 2. Start infrastructure services
docker-compose up -d postgres redis

# 3. Setup Backend API
cd api
cp .env.example .env  # Configure your environment variables
npm install
npx prisma db push
npm run dev

# 4. Setup Worker
cd ../worker
cp .env.example .env
npm install
npm run generate
npm run dev

# 5. Setup Frontend
cd ../frontend
npm install
npm run dev

# 6. Open http://localhost:5173
```

### Environment Variables

<details>
<summary><strong>API (.env)</strong></summary>

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/gitops"

# Redis
REDIS_URL="redis://localhost:6379"

# Authentication
JWT_SECRET="your-super-secret-jwt-key"
GITHUB_CLIENT_ID="your-github-oauth-client-id"
GITHUB_CLIENT_SECRET="your-github-oauth-client-secret"
GITHUB_OAUTH_REDIRECT="http://localhost:3000/api/auth/github/callback"

# Frontend URL (for OAuth redirect)
FRONTEND_URL="http://localhost:5173"
```

</details>

<details>
<summary><strong>Worker (.env)</strong></summary>

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/gitops"

# Redis
REDIS_URL="redis://localhost:6379"

# Docker
DOCKER_ENABLED="true"
```

</details>

<details>
<summary><strong>Frontend (.env)</strong></summary>

```env
VITE_API_URL="http://localhost:3000/api"
```

</details>

---

## 🌐 Deployment

### Production Architecture

Our production deployment uses:
- **Frontend**: Vercel (automatic deployments from GitHub)
- **Backend**: DigitalOcean Droplet ($12/mo - 2GB RAM)
- **Database**: Supabase PostgreSQL (free tier)
- **Domain**: Custom domain with Let's Encrypt SSL

### DigitalOcean Deployment Guide

#### 1. Create Droplet

```bash
# Recommended specs
- Ubuntu 24.04 LTS
- 2GB RAM / 1 vCPU (Basic/Shared)
- Region: Choose closest to your users
```

#### 2. Initial Server Setup

```bash
# SSH into your droplet
ssh root@your-droplet-ip

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose plugin
apt-get update
apt-get install docker-compose-plugin

# Clone the repository
cd /opt
git clone https://github.com/Kunj-Sharma03/GitOps-Nexus.git gitops-nexus
cd gitops-nexus
```

#### 3. Configure Environment

```bash
# Create production environment file
nano .env
```

```env
# Database (Supabase)
API_DATABASE_URL="postgresql://postgres.[project]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
WORKER_DATABASE_URL="postgresql://postgres.[project]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Security
JWT_SECRET="generate-a-strong-secret-here"

# GitHub OAuth
GITHUB_CLIENT_ID="your-github-oauth-client-id"
GITHUB_CLIENT_SECRET="your-github-oauth-client-secret"
GITHUB_OAUTH_REDIRECT="https://api.yourdomain.com/api/auth/github/callback"

# URLs
FRONTEND_URL="https://your-frontend-url.vercel.app"

# Optional: SMTP (Brevo/SendGrid)
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT="587"
SMTP_USER="your-smtp-user"
SMTP_PASS="your-smtp-password"
SMTP_FROM="noreply@yourdomain.com"
```

#### 4. Setup SSL with Let's Encrypt

```bash
# Point your domain to droplet IP (A record)
# Example: api.yourdomain.com -> 165.22.219.116

# Create cert directories
mkdir -p certbot/conf certbot/www

# Stop any services on port 80
docker stop gitops-nginx 2>/dev/null || true

# Get SSL certificate
docker run -it --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  -p 80:80 \
  certbot/certbot certonly --standalone \
  -d api.yourdomain.com \
  --email your@email.com \
  --agree-tos \
  --no-eff-email
```

#### 5. Build and Deploy

```bash
# Build the sandbox image
cd worker
docker build -f Dockerfile.sandbox -t gitops-sandbox:latest .
cd ..

# Start all services
docker compose -f docker-compose.prod.yml up -d --build

# Verify everything is running
docker ps
```

#### 6. Verify Deployment

```bash
# Check API health
curl https://api.yourdomain.com/api/health

# Expected response:
# {"status":"ok","timestamp":"...","database":"connected"}
```

### Vercel Frontend Deployment

1. **Import Project** on [vercel.com](https://vercel.com)
2. **Set Environment Variables**:
   ```
   VITE_API_URL=https://api.yourdomain.com/api
   ```
3. **Deploy** - Vercel auto-deploys on every push to `main`

### GitHub OAuth Setup

1. Go to **GitHub Settings** → **Developer Settings** → **OAuth Apps**
2. Create new OAuth App:
   - **Homepage URL**: `https://your-frontend.vercel.app`
   - **Callback URL**: `https://api.yourdomain.com/api/auth/github/callback`
3. Copy Client ID and Client Secret to your `.env`

---

## 📡 API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/auth/github` | Initiate GitHub OAuth |
| `GET` | `/api/auth/github/callback` | OAuth callback |
| `POST` | `/api/auth/login` | Email/password login |
| `POST` | `/api/auth/signup` | Create account |
| `GET` | `/api/auth/me` | Get current user |

### Repositories

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/repos` | List user repositories |
| `POST` | `/api/repos` | Import repository |
| `GET` | `/api/repos/:id/branches` | List branches |
| `GET` | `/api/repos/:id/files` | Browse file tree |
| `GET` | `/api/repos/:id/file-content` | Get file content |
| `POST` | `/api/repos/:id/commit` | Commit changes |

### CI/CD Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/repos/:id/jobs` | List jobs for repo |
| `POST` | `/api/repos/:id/jobs` | Create new job |
| `GET` | `/api/jobs/:id` | Get job details |
| `GET` | `/api/jobs/:id/logs` | Get job logs |

### Sandboxes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/sessions` | List active sessions |
| `POST` | `/api/sessions` | Create sandbox session |
| `DELETE` | `/api/sessions/:id` | Terminate session |

### WebSocket Events

```javascript
// Connect to Socket.IO
const socket = io('https://api.yourdomain.com');

// Job Logs
socket.emit('join-job', jobId);
socket.on('log', (line) => console.log(line));

// Terminal
const termSocket = io('https://api.yourdomain.com/terminal');
termSocket.emit('terminal:attach', { sessionId });
termSocket.on('terminal:data', (data) => term.write(data));
```

---

## 🔒 Security

### Container Isolation

All CI jobs and sandboxes run with strict security:

```javascript
{
  User: 'node',           // Non-root user
  CapDrop: ['ALL'],       // Drop all Linux capabilities
  SecurityOpt: ['no-new-privileges'],
  Memory: 512 * 1024 * 1024,  // 512MB limit
  NanoCpus: 0.5 * 1e9,        // 0.5 CPU cores
}
```

### Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────►│  GitHub  │────►│   API    │
│          │◄────│  OAuth   │◄────│  Server  │
└──────────┘     └──────────┘     └──────────┘
     │                                  │
     │           JWT Token              │
     │◄─────────────────────────────────│
     │                                  │
     │     API Requests + JWT           │
     │─────────────────────────────────►│
```

---

## 📁 Project Structure

```
GitOps-Nexus/
├── api/                    # Backend API Server
│   ├── src/
│   │   ├── routes/         # Express routes
│   │   ├── lib/            # Utilities (auth, git, cache)
│   │   └── middleware/     # Auth, RBAC middleware
│   ├── prisma/             # Database schema
│   └── Dockerfile
│
├── worker/                 # Background Job Worker
│   ├── src/
│   │   ├── jobs/           # Job handlers
│   │   └── services/       # Notifications, etc.
│   ├── Dockerfile
│   └── Dockerfile.sandbox  # Sandbox container image
│
├── frontend/               # React Frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   └── lib/            # API client, utilities
│   └── vite.config.ts
│
├── nginx/                  # Nginx configuration
│   ├── nginx.conf
│   └── conf.d/api.conf
│
├── docker-compose.yml      # Local development
├── docker-compose.prod.yml # Production deployment
└── README.md
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Code editor
- [xterm.js](https://xtermjs.org/) - Terminal emulator
- [Socket.IO](https://socket.io/) - Real-time communication
- [Prisma](https://www.prisma.io/) - Database ORM
- [BullMQ](https://docs.bullmq.io/) - Job queue
- [Tailwind CSS](https://tailwindcss.com/) - Styling

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/Kunj-Sharma03">Kunj Sharma</a>
</p>

<p align="center">
  <a href="https://github.com/Kunj-Sharma03/GitOps-Nexus">⭐ Star this repo</a> •
  <a href="https://github.com/Kunj-Sharma03/GitOps-Nexus/issues">🐛 Report Bug</a> •
  <a href="https://github.com/Kunj-Sharma03/GitOps-Nexus/issues">💡 Request Feature</a>
</p>