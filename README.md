# GitOps Nexus
### Self-Hosted Cloud DevTools Suite

> A lightweight self-hosted developer platform combining a Git repository browser, web editor, CI job runner with real-time logs, and ephemeral Docker sandboxes — aimed at personal DevOps, learning, and small team workflows.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-MVP%20Complete-success.svg)
![Stack](https://img.shields.io/badge/stack-Node.js%20%7C%20React%20%7C%20Docker-informational.svg)

---

## 🚀 Elevator Pitch

**GitOps Nexus** is a lightweight, self-hosted developer platform designed to streamline personal DevOps and small team workflows. It combines a robust Git repository browser, a Monaco-based web editor, a CI job runner with real-time WebSocket logs, and ephemeral Docker sandboxes into a single, cohesive interface.

## ✨ Core MVP Features

- **Git Repository Browser**: Seamlessly view commits, branches, diffs, and file trees.
- **Web-based Code Editor**: Integrated Monaco editor supporting file open/save, basic syntax highlighting, and direct commits.
- **CI Job Runner**: Execute lint, test, build, and deploy jobs with real-time WebSocket log streaming.
- **Dockerized Sandbox Runner**: Spin up ephemeral containers per job or user workspace for safe execution.
- **User Authentication**: Secure access via OAuth (GitHub) and local accounts (bcrypt + JWT).
- **Unified Dashboard**: Centralized view for repositories, active editor sessions, and CI job status.
- **Backend API**: robust REST API backed by PostgreSQL for metadata and Redis for job scheduling.

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Backend** | Node.js (TypeScript) |
| **Frontend** | React + Vite, Monaco Editor, Tailwind CSS |
| **Database** | PostgreSQL (Metadata: repos, users, jobs) |
| **Queue** | Redis (BullMQ / Bee-Queue) |
| **Runtime** | Docker Engine (Ephemeral containers) |
| **Real-time** | WebSockets (Socket.IO) |
| **Auth** | OAuth2 (GitHub) + Local (bcrypt + JWT) |

## 🏗️ High-Level Architecture

The platform follows a modern microservices-ready architecture:

- **Web UI (React)**: Communicates with the backend via REST and WebSockets.
- **Backend API**: Coordinates repository cloning (Git CLI), database operations, authentication, and job scheduling.
- **Worker Service**: A dedicated process that dequeues jobs from Redis, launches Docker containers, mounts code, runs commands, and streams logs back to the API.
- **Storage**: Local filesystem for repository clones (extensible to S3).

### Data Model

- **User**: Identity management (`id`, `name`, `email`, `provider`, `roles`).
- **Repo**: Repository metadata (`id`, `git_url`, `local_path`, `last_synced`).
- **Job**: CI execution details (`id`, `command`, `status`, `logs_path`, `artifacts_path`).
- **Workspace**: Ephemeral session tracking (`container_id`, `expires_at`).

## 🔄 UX Flows

1.  **Connect/Git Import**: User adds a repo URL or connects via GitHub OAuth. The server clones the repo locally.
2.  **Repo Browser**: Users can list branches, browse the file tree, view commit history, and inspect diffs.
3.  **Editor**: Open files in the Monaco editor, make changes, and save (triggering a commit + push).
4.  **Create CI Job**: Select a branch and command (e.g., `npm test`) to queue a job.
5.  **Job Run**: The worker spins up a container, executes the command, and streams logs in real-time.
6.  **Sandbox Session**: Users can launch an ephemeral container for manual experimentation with port forwarding.

## 🔒 Security & Ops

- **Container Isolation**: Jobs run in containers with limited privileges (non-root) and resource limits (CPU/Memory).
- **Input Validation**: Strict sanitization of Git URLs and user inputs.
- **Authentication**: JWT-based auth with short expiry and refresh tokens.
- **Infrastructure**: Docker Compose for local development; Helm/K8s ready for cloud deployment.

## 🧪 Testing & Quality

- **Unit Tests**: Comprehensive coverage for backend services.
- **Integration Tests**: Job runner validation with mocked Docker interactions.
- **E2E Tests**: Playwright suites for core UI flows (Auth -> Edit -> Commit).
- **Monitoring**: Rotating server logs and basic Prometheus metrics endpoint.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/gitops-nexus.git
    cd gitops-nexus
    ```

2.  **Start Services (Docker)**
    ```bash
    docker-compose up -d postgres redis
    ```

3.  **Install Dependencies & Run**
    ```bash
    # Backend
    cd api && npm install && npm run dev

    # Frontend
    cd frontend && npm install && npm run dev

    # Worker
    cd worker && npm install && npm run dev
    ```

4.  **Access the App**
    Open `http://localhost:5173` to view the dashboard.

---

