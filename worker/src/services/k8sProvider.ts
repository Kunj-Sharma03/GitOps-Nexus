import * as k8s from '@kubernetes/client-node';

export class KubernetesSandboxProvider {
  private kc: k8s.KubeConfig;
  private coreApi: k8s.CoreV1Api;
  public namespace: string;

  constructor() {
    this.kc = new k8s.KubeConfig();
    try {
      this.kc.loadFromDefault();
    } catch (err: any) {
      console.warn(`[K8sProvider] Could not load default kubeconfig: ${err.message}. Sandbox operations may fail if not running in a K8s cluster.`);
    }
    this.coreApi = this.kc.makeApiClient(k8s.CoreV1Api);
    this.namespace = process.env.K8S_NAMESPACE || 'gitops-sandboxes';
  }

  /**
   * Helper to format pod name consistently
   */
  private getPodName(sessionId: string): string {
    return `sandbox-${sessionId.toLowerCase().replace(/[^a-z0-9-]/g, '')}`;
  }

  /**
   * Spawns an isolated sandbox Pod in the Kubernetes cluster
   */
  async startPodSession(params: {
    sessionId: string;
    userId: string;
    repoGitUrl?: string | null;
    defaultBranch?: string;
  }): Promise<{ podName: string; namespace: string }> {
    const { sessionId, userId, repoGitUrl, defaultBranch = 'main' } = params;
    const podName = this.getPodName(sessionId);
    const image = process.env.SANDBOX_IMAGE || 'node:20-alpine';

    console.log(`[K8sProvider] Provisioning Pod ${podName} in namespace ${this.namespace}...`);

    // Clean up any existing pod with the same name first
    try {
      await this.coreApi.deleteNamespacedPod({
        name: podName,
        namespace: this.namespace,
        gracePeriodSeconds: 0,
      });
      console.log(`[K8sProvider] Deleted pre-existing pod ${podName}`);
    } catch (e: any) {
      // Pod doesn't exist, ignore
    }

    const initContainers: k8s.V1Container[] = [];
    
    // If a repository URL is provided, attach an init container to clone the repo into the shared volume
    if (repoGitUrl) {
      initContainers.push({
        name: 'git-clone',
        image: 'alpine/git:latest',
        command: [
          'sh',
          '-c',
          `git clone --branch ${defaultBranch} --depth 1 ${repoGitUrl} /app || git clone ${repoGitUrl} /app`,
        ],
        volumeMounts: [
          {
            name: 'workspace-storage',
            mountPath: '/app',
          },
        ],
        resources: {
          limits: { cpu: '300m', memory: '256Mi' },
          requests: { cpu: '50m', memory: '64Mi' },
        },
      });
    }

    const podManifest: k8s.V1Pod = {
      metadata: {
        name: podName,
        namespace: this.namespace,
        labels: {
          'app.kubernetes.io/name': 'gitops-sandbox',
          'app.kubernetes.io/part-of': 'gitops-nexus',
          'gitops.session.id': sessionId,
          'gitops.user.id': userId,
        },
      },
      spec: {
        restartPolicy: 'Never',
        activeDeadlineSeconds: 7200, // Maximum Pod lifetime: 2 hours
        initContainers: initContainers.length > 0 ? initContainers : undefined,
        containers: [
          {
            name: 'sandbox',
            image: image,
            command: ['/bin/sh', '-c', 'while true; do sleep 3600; done'],
            workingDir: '/app',
            volumeMounts: [
              {
                name: 'workspace-storage',
                mountPath: '/app',
              },
            ],
            resources: {
              limits: {
                cpu: '500m',
                memory: '512Mi',
              },
              requests: {
                cpu: '100m',
                memory: '128Mi',
              },
            },
            securityContext: {
              allowPrivilegeEscalation: false,
            },
          },
        ],
        volumes: [
          {
            name: 'workspace-storage',
            emptyDir: {},
          },
        ],
      },
    };

    // Create the Pod in the cluster
    await this.coreApi.createNamespacedPod({
      namespace: this.namespace,
      body: podManifest,
    });

    console.log(`[K8sProvider] Pod ${podName} created. Awaiting Running phase...`);

    // Poll until the Pod enters the 'Running' phase (or timeout after 45 seconds)
    const startTime = Date.now();
    const timeoutMs = 45000;

    while (Date.now() - startTime < timeoutMs) {
      try {
        const pod = await this.coreApi.readNamespacedPodStatus({
          name: podName,
          namespace: this.namespace,
        });

        const phase = pod.status?.phase;
        if (phase === 'Running') {
          console.log(`[K8sProvider] Pod ${podName} is now Running.`);
          return { podName, namespace: this.namespace };
        } else if (phase === 'Failed') {
          throw new Error(`Pod ${podName} entered Failed phase.`);
        }
      } catch (err: any) {
        if (err.message?.includes('Failed phase')) throw err;
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    throw new Error(`Timed out waiting for Pod ${podName} to enter Running phase.`);
  }

  /**
   * Gracefully terminates a sandbox Pod
   */
  async stopPodSession(sessionId: string): Promise<void> {
    const podName = this.getPodName(sessionId);
    console.log(`[K8sProvider] Deleting Pod ${podName} in namespace ${this.namespace}...`);

    try {
      await this.coreApi.deleteNamespacedPod({
        name: podName,
        namespace: this.namespace,
        gracePeriodSeconds: 0,
      });
      console.log(`[K8sProvider] Pod ${podName} deleted successfully.`);
    } catch (err: any) {
      if (err.response?.statusCode === 404 || err.statusCode === 404) {
        console.log(`[K8sProvider] Pod ${podName} was already removed.`);
      } else {
        console.error(`[K8sProvider] Error deleting Pod ${podName}:`, err.message);
      }
    }
  }

  /**
   * Scans the namespace and cleans up orphaned or expired sandbox Pods
   */
  async cleanupExpiredPods(activeSessionIds: Set<string>): Promise<number> {
    try {
      const response = await this.coreApi.listNamespacedPod({
        namespace: this.namespace,
        labelSelector: 'app.kubernetes.io/name=gitops-sandbox',
      });

      const pods = response.items || [];
      let cleaned = 0;

      for (const pod of pods) {
        const sessionId = pod.metadata?.labels?.['gitops.session.id'];
        const podName = pod.metadata?.name;

        if (podName && sessionId && !activeSessionIds.has(sessionId)) {
          console.log(`[K8sProvider] Cleaning up expired/orphan sandbox Pod ${podName}...`);
          try {
            await this.coreApi.deleteNamespacedPod({
              name: podName,
              namespace: this.namespace,
              gracePeriodSeconds: 0,
            });
            cleaned++;
          } catch (e: any) {
            console.warn(`[K8sProvider] Failed to delete Pod ${podName}:`, e.message);
          }
        }
      }

      return cleaned;
    } catch (err: any) {
      console.error('[K8sProvider] Error listing pods for cleanup:', err.message);
      return 0;
    }
  }
}

export const k8sProvider = new KubernetesSandboxProvider();
