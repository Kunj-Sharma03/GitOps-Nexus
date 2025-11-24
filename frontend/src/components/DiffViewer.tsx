import { useEffect, useState } from 'react'
import { getDiff } from '../lib/api'

export default function DiffViewer({ repoId, base, head }: { repoId: string | null, base: string, head: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [diff, setDiff] = useState<any | null>(null)

  useEffect(() => {
    if (!repoId || !base || !head) return
    setLoading(true)
    setError(null)
    getDiff(repoId, base, head)
      .then((r: any) => setDiff(r))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [repoId, base, head])

  if (!repoId) return null

  return (
    <div className="p-3 bg-dystopia-card/30 border border-dystopia-border/50 rounded-md min-h-[120px]">
      <div className="text-xs text-dystopia-muted mb-2">Diff ({base} → {head})</div>
      {loading && <div className="text-dystopia-primary text-sm">Loading diff...</div>}
      {error && <div className="text-dystopia-secondary text-sm">ERROR: {error}</div>}
      {diff && (
        <div className="text-sm font-mono overflow-auto max-h-72 bg-dystopia-bg/40 p-2 rounded">
          {/* render a simple inline diff */}
          {Array.isArray(diff.files) ? diff.files.map((f: any) => (
            <div key={f.filename} className="mb-3">
              <div className="text-xs text-dystopia-accent mb-1">{f.filename}</div>
              <pre className="text-[12px] whitespace-pre-wrap">{f.patch || '(no patch available)'}</pre>
            </div>
          )) : <pre className="text-[12px] whitespace-pre-wrap">{JSON.stringify(diff, null, 2)}</pre>}
        </div>
      )}
    </div>
  )
}
