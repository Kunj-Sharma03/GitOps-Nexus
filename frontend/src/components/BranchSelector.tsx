import { useEffect, useState } from 'react'
import { getBranches } from '../lib/api'

export default function BranchSelector({ repoId, value, onChange }: { repoId: string | null, value?: string, onChange: (b: string) => void }) {
  const [branches, setBranches] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!repoId) return
    setLoading(true)
    getBranches(repoId)
      .then((r: any) => setBranches(r.branches || r))
      .catch(() => setBranches([]))
      .finally(() => setLoading(false))
  }, [repoId])

  if (!repoId) return null

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-dystopia-muted font-medium">BRANCH</span>
      <div className="relative w-full">
        <select 
          className="block w-full bg-dystopia-bg/50 border border-dystopia-border rounded-lg text-dystopia-text p-2 text-xs focus:border-dystopia-primary focus:ring-1 focus:ring-dystopia-primary focus:outline-none transition-all appearance-none cursor-pointer hover:bg-dystopia-card/50" 
          value={value} 
          onChange={e => onChange(e.target.value)}
        >
          {loading ? <option>Loading...</option> : branches.map((b: any) => <option key={b.name || b} value={b.name || b}>{b.name || b}</option>)}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-dystopia-muted">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
        </div>
      </div>
    </div>
  )
}
