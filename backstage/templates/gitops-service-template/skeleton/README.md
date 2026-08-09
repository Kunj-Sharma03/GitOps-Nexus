# ${{ values.component_id }}

${{ values.description }}

---

## 🚀 Quickstart

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Locally
```bash
npm start
```

### 3. Healthcheck
```bash
curl http://localhost:${{ values.port }}/healthz
```

---

## 🔄 CI/CD & Sandboxes

This service is automatically tracked by **GitOps Nexus**:
- Every push to `main` triggers automated CI steps defined in `.gitops.yml`.
- Interactive developer sandboxes and live terminal sessions can be spawned directly inside the GitOps Nexus dashboard.
