export const API_BASE = (window as any).__API_URL__ || import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

function jwtHeader(): Record<string, string> {
  const token = localStorage.getItem('jwt') || ''
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function apiFetch(path: string, opts: RequestInit = {}) {
  const url = `${API_BASE}${path.startsWith('/') ? path : '/' + path}`
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as Record<string, string> || {}) }
  const auth = jwtHeader()
  if (auth.Authorization) headers.Authorization = auth.Authorization
  const res = await fetch(url, { ...opts, headers })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${res.statusText}: ${text}`)
  }
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) return res.json()
  return res.text()
}

export async function getRepos() {
  return apiFetch('/repos')
}

export async function createRepo(gitUrl: string, name?: string) {
  return apiFetch('/repos', { method: 'POST', body: JSON.stringify({ gitUrl, name }) })
}

export async function getBranches(repoId: string) {
  return apiFetch(`/repos/${repoId}/branches`)
}

export async function getFiles(repoId: string, branch: string) {
  return apiFetch(`/repos/${repoId}/files?branch=${encodeURIComponent(branch)}`)
}

export async function getFileContent(repoId: string, path: string, branch?: string) {
  const q = `?path=${encodeURIComponent(path)}${branch ? `&branch=${encodeURIComponent(branch)}` : ''}`
  return apiFetch(`/repos/${repoId}/file-content${q}`)
}

export async function getDiff(repoId: string, base: string, head: string) {
  const q = `?base=${encodeURIComponent(base)}&head=${encodeURIComponent(head)}`
  return apiFetch(`/repos/${repoId}/diff${q}`)
}

export async function postCommit(repoId: string, path: string, content: string, message: string, branch?: string, dryRun = false, parentSha?: string) {
  const body: any = { path, content, message, dryRun }
  if (branch) body.branch = branch
  if (parentSha) body.parentSha = parentSha
  return apiFetch(`/repos/${repoId}/commit`, { method: 'POST', body: JSON.stringify(body) })
}

export async function getCommits(repoId: string, path: string, limit = 20) {
  const q = `?path=${encodeURIComponent(path)}&limit=${encodeURIComponent(String(limit))}`
  return apiFetch(`/repos/${repoId}/commits${q}`)
}

export async function postRevert(repoId: string, path: string, sha: string, branch?: string, dryRun = true) {
  const body: any = { path, sha, dryRun }
  if (branch) body.branch = branch
  return apiFetch(`/repos/${repoId}/revert`, { method: 'POST', body: JSON.stringify(body) })
}

export async function getJobs(repoId: string) {
  return apiFetch(`/repos/${repoId}/jobs`)
}

export async function createJob(repoId: string, command: string, branch?: string) {
  return apiFetch(`/repos/${repoId}/jobs`, { method: 'POST', body: JSON.stringify({ command, branch }) })
}

export async function getJob(jobId: string) {
  return apiFetch(`/jobs/${jobId}`)
}

export default apiFetch
