import { useEffect, useState } from 'react'
import { getRepos } from '../lib/api'
import { RoleBadge } from './CollaboratorsPanel'

type RepoRole = 'OWNER' | 'ADMIN' | 'WRITE' | 'VIEWER'

interface Repo {
  id: string
  name: string
  gitUrl: string
  role?: RepoRole
  isOwner?: boolean
  user?: {
    id: string
    name: string | null
    email: string
    avatar: string | null
  }
}

export default function RepoList({ onSelect }: { onSelect: (repo: any) => void }) {
  const [repos, setRepos] = useState<Repo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    getRepos()
      .then((r: any) => setRepos(r.repos || r))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-4 text-dystopia-muted animate-pulse">SCANNING NETWORK...</div>
  if (error) return <div className="p-4 text-dystopia-secondary">ERROR: {error}</div>

  // Separate owned repos from shared repos
  const ownedRepos = repos.filter(r => r.isOwner !== false)
  const sharedRepos = repos.filter(r => r.isOwner === false)

  return (
    <div className="space-y-4">
      {/* Owned Repos */}
      {ownedRepos.length > 0 && (
        <div>
          <div className="px-3 py-2 text-[10px] text-white/40 uppercase tracking-widest font-medium">
            Your Repositories ({ownedRepos.length})
          </div>
          <ul className="space-y-1">
            {ownedRepos.map((r) => (
              <RepoItem key={r.id} repo={r} onSelect={onSelect} />
            ))}
          </ul>
        </div>
      )}

      {/* Shared Repos */}
      {sharedRepos.length > 0 && (
        <div>
          <div className="px-3 py-2 text-[10px] text-white/40 uppercase tracking-widest font-medium border-t border-white/5 pt-4">
            Shared With You ({sharedRepos.length})
          </div>
          <ul className="space-y-1">
            {sharedRepos.map((r) => (
              <RepoItem key={r.id} repo={r} onSelect={onSelect} showOwner />
            ))}
          </ul>
        </div>
      )}

      {repos.length === 0 && (
        <div className="p-4 text-center text-white/30 text-sm">
          No repositories yet
        </div>
      )}
    </div>
  )
}

function RepoItem({ repo, onSelect, showOwner = false }: { repo: Repo; onSelect: (repo: any) => void; showOwner?: boolean }) {
  return (
    <li>
      <button 
        className="text-left w-full p-3 rounded-xl border border-transparent hover:border-dystopia-border hover:bg-dystopia-primary/5 transition-all duration-300 group relative overflow-hidden" 
        onClick={() => onSelect(repo)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="font-medium text-dystopia-text group-hover:text-dystopia-primary transition-colors truncate flex items-center gap-2 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-dystopia-muted group-hover:bg-dystopia-primary transition-colors shrink-0"></span>
            <span className="truncate">{repo.name}</span>
          </div>
          {repo.role && repo.role !== 'OWNER' && (
            <RoleBadge role={repo.role} size="sm" />
          )}
        </div>
        <div className="text-[10px] text-dystopia-muted truncate pl-3.5 mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
          {showOwner && repo.user ? (
            <span className="text-white/50">by {repo.user.name || repo.user.email} · </span>
          ) : null}
          {repo.gitUrl}
        </div>
      </button>
    </li>
  )
}
