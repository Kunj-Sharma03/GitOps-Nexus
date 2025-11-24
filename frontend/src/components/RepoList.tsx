import { useEffect, useState } from 'react'
import { getRepos } from '../lib/api'

export default function RepoList({ onSelect }: { onSelect: (repo: any) => void }) {
  const [repos, setRepos] = useState<any[]>([])
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

  return (
    <ul className="space-y-2">
      {repos.map((r: any) => (
        <li key={r.id}>
          <button 
            className="text-left w-full p-3 rounded-xl border border-transparent hover:border-dystopia-border hover:bg-dystopia-primary/5 transition-all duration-300 group relative overflow-hidden" 
            onClick={() => onSelect(r)}
          >
            <div className="font-medium text-dystopia-text group-hover:text-dystopia-primary transition-colors truncate flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-dystopia-muted group-hover:bg-dystopia-primary transition-colors"></span>
              {r.name}
            </div>
            <div className="text-[10px] text-dystopia-muted truncate pl-3.5 mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
              {r.gitUrl}
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}
