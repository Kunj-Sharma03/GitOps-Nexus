# GitOps Nexus - Backstage IDP (Internal Developer Portal) Integration

This directory contains the **Software Templates** and architecture blueprints for integrating **GitOps Nexus** with **Spotify Backstage**, the industry-standard Internal Developer Portal (IDP).

---

## 🎯 What This Enables

In modern Platform Engineering, developers should not have to manually configure CI/CD pipelines, Dockerfiles, or Kubernetes namespaces for every new service.

With this Backstage integration:
1. **Self-Service Scaffolding**: A developer clicks **"Create..."** in Backstage and selects the **GitOps Nexus Node.js Microservice** template.
2. **Automated CI/CD Provisioning**: The template generates a production-ready repository with `.gitops.yml` pre-configured.
3. **Instant Kubernetes Sandbox Access**: The new service is immediately registered with GitOps Nexus, enabling 1-click ephemeral Kubernetes terminal sandboxes.

---

## 📁 Directory Structure

```
backstage/
├── templates/
│   └── gitops-service-template/
│       ├── template.yaml            # Scaffolder Template definition
│       └── skeleton/                # Boilerplate files parameterized during scaffolding
│           ├── catalog-info.yaml    # Backstage component catalog registration
│           ├── .gitops.yml          # GitOps Nexus CI/CD workflow configuration
│           ├── package.json         # Node.js project manifest
│           ├── README.md            # Service documentation
│           └── src/
│               └── index.js         # Healthchecked Express server
└── README.md                        # Documentation & setup guide
```

---

## 🚀 How to Run Backstage Locally & Connect GitOps Nexus

### Step 1: Create a Local Backstage App
If you haven't created a local Backstage instance yet:
```bash
npx @backstage/create-app@latest
# Follow prompts to create your backstage-app
```

### Step 2: Register the GitOps Nexus Template
In your Backstage app's `app-config.yaml`, add the path to the template under `catalog.locations`:

```yaml
catalog:
  locations:
    # GitOps Nexus Microservice Template
    - type: file
      target: ../gitops-project/backstage/templates/gitops-service-template/template.yaml
      rules:
        - allow: [Template]
```

### Step 3: Start Backstage
```bash
cd backstage-app
yarn dev
```

Open `http://localhost:3000/create` in your browser. You will see the **GitOps Nexus Node.js Microservice** template ready for self-service creation!

---

## 🔄 End-to-End Platform Flow

```
[Developer in Backstage UI]
            |
            v
  1. Chooses "GitOps Nexus Node Service" Template
  2. Enters Service Name & Owner
  3. Clicks "Create Component"
            |
            v
[Backstage Scaffolder Engine]
  - Renders skeleton files (.gitops.yml, catalog-info.yaml, Express app)
  - Pushes initial commit to Git repository
            |
            v
[GitOps Nexus Engine]
  - Detects new repository & registers webhook
  - Automatically provisions isolated Kubernetes Sandbox Pod (`gitops-sandboxes`)
  - Runs initial CI/CD pipeline verification
```
