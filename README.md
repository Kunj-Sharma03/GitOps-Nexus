<p align="center">
  <img src="https://img.shields.io/badge/GitOps-Nexus-22c55e?style=for-the-badge&logo=git&logoColor=white" alt="GitOps Nexus" />
</p>

<h1 align="center">🚀 GitOps Nexus</h1>

<p align="center">
  <strong>Self-Hosted Cloud DevTools Suite</strong>
</p>

<p align="center">
  A lightweight self-hosted developer platform combining a Git repository browser, web editor, CI job runner with real-time logs, and ephemeral Kubernetes sandboxes — designed for personal DevOps, learning, and small team workflows.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/status-Production%20Ready-success.svg?style=flat-square" alt="Status" />
  <img src="https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/React-18+-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/K3s-Kubernetes-326CE5?style=flat-square&logo=kubernetes&logoColor=white" alt="Kubernetes" />
  <img src="https://img.shields.io/badge/Terraform-AWS-7B42BC?style=flat-square&logo=terraform&logoColor=white" alt="Terraform" />
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
| **Backstage** | (Internal Developer Portal running on AWS) |

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

### 🔄 CI/CD Pipeline
- **One-Click Job Execution** - Run lint, test, build, deploy commands
- **Real-Time Logs** - Live streaming via WebSocket (Socket.IO)
- **Job History** - Track all past executions with logs

### ☸️ Ephemeral Sandboxes (Kubernetes)
- **Interactive Terminals** - Full bash access in browser
- **Isolated Pods** - Secure, ephemeral Kubernetes environments via K3s
- **Auto-Cleanup** - Sessions expire and pods terminate automatically

### 👥 Collaboration & Security
- **Role-Based Access** - Owner, Admin, Editor, Viewer roles
- **GitHub OAuth 2.0** - Social login integration
- **JWT Authentication** - Secure token-based auth

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
- 🎯 Backstage (Developer Portal)

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

- ☁️ AWS EC2 (t3.small)
- 🏗️ Terraform (IaC)
- ☸️ K3s (Kubernetes Engine)
- 🐳 Docker & Docker Compose
- 🌐 Nginx (Reverse Proxy) + Let's Encrypt SSL
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
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NGINX REVERSE PROXY                           │
│                 kunjdevaws.duckdns.org:443                       │
└──────────────────────────────┬──────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌───────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API SERVER  │    │     WORKER      │    │    BACKSTAGE    │
│   (Express)   │◄──►│   (BullMQ)      │    │  (Dev Portal)   │
└───────┬───────┘    └────────┬────────┘    └─────────────────┘
        │                     │
        ▼                     ▼
┌───────────────────┐ ┌───────────────────┐
│    POSTGRESQL     │ │   K3S KUBERNETES  │
│    (Supabase)     │ │   - CI Pods       │
│                   │ │   - Sandbox Pods  │
└───────────────────┘ └───────────────────┘
```

---

## 🚀 Getting Started

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/Kunj-Sharma03/GitOps-Nexus.git
cd GitOps-Nexus

# 2. Start infrastructure services
docker-compose up -d postgres redis

# 3. Setup Backend API
cd api
cp .env.example .env
npm install
npx prisma db push
npm run dev

# 4. Setup Worker
cd ../worker
cp .env.example .env
npm install
npm run dev

# 5. Setup Frontend
cd ../frontend
npm install
npm run dev
```

---

## 🌐 Production Deployment (AWS + Terraform)

We use **Terraform** to provision a highly-optimized AWS EC2 instance (`t3.small`) that runs K3s and our Docker stack. 

For the complete step-by-step deployment instructions, please refer to the dedicated **[AWS Deployment Guide](AWS_DEPLOYMENT_GUIDE.md)** included in the repository.

### Quick Deployment Summary
1. Initialize Terraform in the `/terraform/environments/aws` directory.
2. Run `terraform apply` to provision the EC2 server, Elastic IP, Security Groups, and install K3s via cloud-init.
3. Push the latest `docker-compose.prod.yml` and `.env` files to the EC2 server.
4. Run `docker compose up -d` on the server to spin up Nginx, API, Worker, Redis, and Backstage.

---

## 📁 Project Structure

```
GitOps-Nexus/
├── api/                    # Backend API Server
├── worker/                 # Background Job Worker (interacts with K3s)
├── frontend/               # React Frontend (Vercel)
├── backstage/              # Backstage Developer Portal
├── terraform/              # AWS Infrastructure as Code
├── nginx/                  # Nginx configuration
├── docker-compose.yml      # Local development
├── docker-compose.prod.yml # Production deployment
└── AWS_DEPLOYMENT_GUIDE.md # Production Deployment Guide
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/Kunj-Sharma03">Kunj Sharma</a>
</p>

<p align="center">
  <a href="https://github.com/Kunj-Sharma03/GitOps-Nexus">⭐ Star this repo</a> •
  <a href="https://github.com/Kunj-Sharma03/GitOps-Nexus/issues">🐛 Report Bug</a> •
  <a href="https://github.com/Kunj-Sharma03/GitOps-Nexus/issues">💡 Request Feature</a>
</p>