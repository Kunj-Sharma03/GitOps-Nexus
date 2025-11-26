export function buildGitHubUrl(repo: any, branch: string | undefined, path: string | undefined) {
  if (!repo) return null

  // Normalize common fields where a git URL might be stored
  const candidates = [
    repo.html_url,
    repo.htmlUrl,
    repo.html,
    repo.url,
    repo.homepage,
    repo.giturl,
    repo.git_url,
    repo.gitUrl,
    repo.repository_url,
    repo.repo_url,
    repo.web_url,
    repo.clone_url,
    repo.cloneUrl,
    repo.ssh_url,
    repo.sshUrl,
  ]

  // Helper: normalize a git remote/clone URL into an https GitHub base URL
  const normalizeToHttps = (raw: string | undefined | null) => {
    if (!raw || typeof raw !== 'string') return null
    let s = raw.trim()
    // strip git+ prefix
    s = s.replace(/^git\+/, '')
    // if it's already a webpage URL containing github.com
    if (s.includes('github.com')) {
      // convert ssh style git@github.com:owner/name.git -> https://github.com/owner/name
      const sshMatch = s.match(/git@github\.com:([^/]+)\/([^/]+)(?:\.git)?$/)
      if (sshMatch) return `https://github.com/${sshMatch[1]}/${sshMatch[2].replace(/\.git$/, '')}`
      // remove any /blob/... or /tree/... suffixes
      const noGit = s.replace(/\.git$/, '')
      // ensure https scheme
      if (noGit.startsWith('http')) return noGit.replace(/(^https?:\/\/)/, 'https://')
      // fallback: if it's like github.com/owner/name
      if (noGit.startsWith('github.com')) return `https://${noGit}`
    }
    return null
  }

  // Try candidate fields first
  for (const c of candidates) {
    const v = normalizeToHttps(c)
    if (v) {
      const base = v.replace(/\.git$/, '')
      if (path) {
        const p = encodeURIComponent(path).replace(/%2F/g, '/')
        return `${base}/blob/${encodeURIComponent(branch || 'main')}/${p}`
      }
      return base
    }
  }

  // Try owner/name fields as fallback
  const owner = repo.owner || repo.owner_name || (repo.owner && repo.owner.login) || repo.ownerLogin
  const name = repo.name || repo.repo || repo.repository || repo.repo_name
  if (owner && name) {
    const b = encodeURIComponent(branch || 'main')
    if (path) {
      const p = encodeURIComponent(path).replace(/%2F/g, '/')
      return `https://github.com/${owner}/${name}/blob/${b}/${p}`
    }
    return `https://github.com/${owner}/${name}`
  }

  return null
}

export function buildPermalink(baseUrl: string, repoId: string, path: string, branch?: string) {
  // Build app permalink to editor route
  const url = new URL(baseUrl)
  url.pathname = '/editor'
  url.searchParams.set('repoId', repoId)
  url.searchParams.set('path', path)
  if (branch) url.searchParams.set('branch', branch)
  return url.toString()
}
