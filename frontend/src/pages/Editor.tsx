import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import MonacoWrapper from '../components/MonacoWrapper'
import BranchSelector from '../components/BranchSelector'
import { getFileContent, postCommit, getCommits, postRevert } from '../lib/api'
import { buildGitHubUrl, buildPermalink } from '../lib/utils'

export default function Editor() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const repoId = params.get('repoId')
  const path = params.get('path')
  const initialBranch = params.get('branch') || 'main'

  const [branch, setBranch] = useState(initialBranch)
  const [content, setContent] = useState<string>('')
  const [sha, setSha] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [message, setMessage] = useState('Update via GitOps Nexus')
  const [dryRun, setDryRun] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autosave, setAutosave] = useState(true)
  const [draftExists, setDraftExists] = useState(false)
  const [showRecover, setShowRecover] = useState(false)
  const [commits, setCommits] = useState<any[]>([])
  const [repoMeta, setRepoMeta] = useState<any | null>(null)
  // editor instance stored globally on mount for keyboard shortcuts
  const [showSidebar, setShowSidebar] = useState(true)

  useEffect(() => {
    if (!repoId || !path) return
    setLoading(true)
    getFileContent(repoId, path, branch)
      .then((r: any) => {
        setContent(r.content || r)
        if (r.sha) setSha(r.sha)
      })
      .catch((e) => setError(e.message || 'Failed to load file'))
      .finally(() => setLoading(false))
  }, [repoId, path, branch])

  // fetch repo meta (from cached repo list)
  useEffect(() => {
    if (!repoId) return
    // lazy-load repos and find matching id
    import('../lib/api').then(({ getRepos }) => {
      getRepos().then((r: any) => {
        const repos = r.repos || r
        const found = Array.isArray(repos) ? repos.find((x: any) => String(x.id) === String(repoId)) : null
        setRepoMeta(found || null)
      }).catch(() => setRepoMeta(null))
    }).catch(() => setRepoMeta(null))
  }, [repoId])

  // Check for saved draft when content loads
  useEffect(() => {
    if (!repoId || !path) return
    const key = `draft:${repoId}:${path}:${branch}`
    const raw = localStorage.getItem(key)
    if (raw) {
      setDraftExists(true)
      // if remote content differs from draft, show recover option
      try {
        const draft = JSON.parse(raw)
        if (draft && draft.content !== content) setShowRecover(true)
      } catch (e) {
        setShowRecover(true)
      }
    } else {
      setDraftExists(false)
      setShowRecover(false)
    }
  }, [repoId, path, branch, content])

  // Load commit history for the file
  useEffect(() => {
    if (!repoId || !path) return
    getCommits(repoId, path, 30)
      .then((r: any) => setCommits(r.commits || r || []))
      .catch(() => setCommits([]))
  }, [repoId, path])

  const doSave = useCallback(async () => {
    if (!repoId || !path) return setError('Missing repoId or path')
    setLoading(true)
    setError(null)
    try {
      const res = await postCommit(repoId, path, content, message, branch, dryRun, sha)
      console.log('save response', res)
      setDirty(false)
      
      if (!dryRun && res.result && res.result.content && res.result.content.sha) {
        setSha(res.result.content.sha)
      }

      if (dryRun) alert('Dry run OK — no changes pushed')
      else alert('Saved and committed')
    } catch (e: any) {
      if (e.message && (e.message.includes('409') || e.message.includes('Conflict'))) {
        if (confirm('Conflict detected: File has been modified on server. Overwrite anyway?')) {
          try {
            const res = await postCommit(repoId, path, content, message, branch, dryRun, undefined)
            setDirty(false)
            if (!dryRun && res.result && res.result.content && res.result.content.sha) {
              setSha(res.result.content.sha)
            }
            alert('Overwritten successfully')
          } catch (retryErr: any) {
            setError(retryErr.message || String(retryErr))
          }
        }
      } else {
        setError(e.message || String(e))
      }
    } finally {
      setLoading(false)
    }
  }, [repoId, path, content, message, branch, dryRun, sha])

  // Draft helpers
  const draftKey = () => `draft:${repoId}:${path}:${branch}`

  const saveDraft = (note?: string) => {
    if (!repoId || !path) return
    try {
      const payload = { content, message, savedAt: Date.now(), note: note || 'manual' }
      localStorage.setItem(draftKey(), JSON.stringify(payload))
      setDraftExists(true)
      setShowRecover(false)
    } catch (e) {
      console.error('Failed to save draft', e)
    }
  }

  const discardDraft = () => {
    if (!repoId || !path) return
    localStorage.removeItem(draftKey())
    setDraftExists(false)
    setShowRecover(false)
  }

  // Autosave effect (debounced)
  useEffect(() => {
    if (!autosave || !repoId || !path) return
    const id = setInterval(() => {
      if (dirty) saveDraft('autosave')
    }, 5000)
    return () => clearInterval(id)
  }, [autosave, repoId, path, content, dirty])

  // Recover draft
  const recoverDraft = () => {
    if (!repoId || !path) return
    const raw = localStorage.getItem(draftKey())
    if (!raw) return
    try {
      const d = JSON.parse(raw)
      if (d && typeof d.content === 'string') {
        setContent(d.content)
        setMessage(d.message || '')
        setDirty(true)
      }
    } catch (e) {
      console.error('Failed to parse draft', e)
    }
    setShowRecover(false)
  }

  // Rollback / revert commit
  const handleRevert = async (sha: string) => {
    if (!repoId || !path) return setError('Missing context')
    const sure = window.confirm(`Revert to commit ${sha}? This will ${dryRun ? 'simulate' : 'actually'} create a revert commit.`)
    if (!sure) return
    setLoading(true)
    try {
      await postRevert(repoId, path, sha, branch, dryRun)
      alert(dryRun ? 'Revert simulated successfully' : 'Revert committed')
      // refresh commits after action
      const updated = await getCommits(repoId, path, 30)
      setCommits(updated.commits || updated || [])
    } catch (e: any) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  // Quick actions
  const openInGitHub = () => {
    try {
      const url = buildGitHubUrl(repoMeta, branch, path || undefined)
      if (url) window.open(url, '_blank')
      else alert('No GitHub URL available for this repository')
    } catch (e) {
      console.error(e)
      alert('Unable to build GitHub URL')
    }
  }

  const copyPath = async () => {
    try {
      const txt = `${repoMeta?.name || repoId}:${path}`
      await navigator.clipboard.writeText(txt)
      alert('Path copied to clipboard')
    } catch (e) {
      console.error(e)
      alert('Failed to copy')
    }
  }

  const copyPermalink = async () => {
    try {
      const base = window.location.origin
      const url = buildPermalink(base, String(repoId), String(path || ''), branch)
      await navigator.clipboard.writeText(url)
      alert('Permalink copied to clipboard')
    } catch (e) {
      console.error(e)
      alert('Failed to copy permalink')
    }
  }

  // keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        doSave()
      }
      // Ctrl/Cmd+F -> trigger editor find
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        try {
          const inst = (window as any).__MONACO_EDITOR_INSTANCE__
          if (inst && inst.getAction) inst.getAction('actions.find').run()
        } catch (err) {
          console.error('Find action failed', err)
        }
      }
      // Ctrl/Cmd+B toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        setShowSidebar(s => !s)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [doSave])

  if (!repoId || !path) {
    return (
      <div className="h-screen flex items-center justify-center bg-dystopia-bg text-dystopia-muted font-mono">
        <div className="text-center">
          <h1 className="text-xl text-dystopia-secondary mb-2">MISSING PARAMETERS</h1>
          <p>Editor requires `repoId` and `path` query parameters.</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-dystopia-primary hover:underline">Go Back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-dystopia-bg text-dystopia-text overflow-hidden font-mono">
      {/* Header */}
      <header className="h-14 border-b border-dystopia-border flex items-center px-6 justify-between bg-dystopia-card/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="text-dystopia-muted hover:text-dystopia-primary transition-colors flex items-center gap-2 text-sm uppercase tracking-wider"
          >
            <span className="text-lg">‹</span> Back
          </button>
          <div className="h-4 w-px bg-dystopia-border mx-2"></div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-dystopia-muted">EDITING //</span>
            <span className="text-dystopia-accent font-bold tracking-wide">{path}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
           {dirty ? (
             <span className="text-xs text-dystopia-secondary animate-pulse font-bold uppercase tracking-widest">● Unsaved Changes</span>
           ) : (
             <span className="text-xs text-dystopia-muted uppercase tracking-widest">All Changes Saved</span>
           )}
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Column */}
        <div className={`flex-1 relative bg-dystopia-bg ${showSidebar ? '' : 'px-6'}`}>
          <MonacoWrapper 
            value={content} 
            onChange={(v) => { setContent(v); setDirty(true) }} 
            language={path?.endsWith('.ts') ? 'typescript' : path?.endsWith('.js') ? 'javascript' : 'markdown'} 
            height="100%"
            onEditorMount={(ed) => {
              try { (window as any).__MONACO_EDITOR_INSTANCE__ = ed } catch(e){}
            }}
          />
        </div>

        {/* Sidebar Column */}
        <div className="w-80 border-l border-dystopia-border bg-dystopia-card flex flex-col shadow-xl z-20">
          <div className="p-5 border-b border-dystopia-border">
            <h2 className="text-xs font-bold text-dystopia-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-dystopia-primary rounded-full"></span>
              Commit Control
            </h2>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1">
                <label className="block text-[10px] text-dystopia-muted uppercase tracking-wider mb-2">Branch</label>
                <BranchSelector repoId={repoId} value={branch} onChange={setBranch} showLabel={false} />
              </div>
              <div className="w-28">
                <label className="block text-[10px] text-dystopia-muted uppercase tracking-wider mb-2">Autosave</label>
                <div className="flex items-center gap-2">
                  <input id="autosave" type="checkbox" checked={autosave} onChange={(e) => setAutosave(e.target.checked)} className="h-4 w-4" />
                  <label htmlFor="autosave" className="text-[10px] text-dystopia-muted">Enabled</label>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-[10px] text-dystopia-muted uppercase tracking-wider mb-2">Commit Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-black/40 border border-dystopia-border rounded-sm p-3 text-xs text-dystopia-text focus:border-dystopia-primary focus:ring-1 focus:ring-dystopia-primary outline-none transition-all resize-none h-28 placeholder-dystopia-muted/50"
                placeholder="Describe your changes..."
              />
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 mb-4">
              <button onClick={openInGitHub} className="text-xs px-2 py-1 rounded border border-dystopia-border text-dystopia-muted hover:text-dystopia-primary">Open in GitHub</button>
              <button onClick={copyPath} className="text-xs px-2 py-1 rounded border border-dystopia-border text-dystopia-muted hover:text-dystopia-primary">Copy Path</button>
              <button onClick={copyPermalink} className="text-xs px-2 py-1 rounded border border-dystopia-border text-dystopia-muted hover:text-dystopia-primary">Permalink</button>
            </div>

            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} className="h-4 w-4" />
                  <span className="text-xs text-dystopia-muted">Dry run</span>
                </label>
                {(!autosave || showRecover) && (
                  <>
                    <button onClick={() => saveDraft('manual')} className="text-xs px-2 py-1 rounded bg-dystopia-card/30 border border-dystopia-border/40 hover:bg-dystopia-primary/10">Save Draft</button>
                    {draftExists && (
                      <button onClick={() => { if (confirm('Discard saved draft?')) discardDraft() }} className="text-xs px-2 py-1 rounded border border-dystopia-border/30 text-dystopia-muted hover:text-dystopia-secondary">Discard Draft</button>
                    )}
                  </>
                )}
              </div>

              <button
                disabled={loading || !dirty}
                onClick={doSave}
                className={`px-3 py-2 rounded-sm font-bold text-xs uppercase tracking-[0.12em] transition-all ${loading ? 'bg-dystopia-muted/20 text-dystopia-muted' : dirty ? 'bg-dystopia-primary text-black' : 'bg-dystopia-border/50 text-dystopia-muted'}`}
              >
                {loading ? 'Processing…' : (dryRun ? 'Verify' : 'Commit')}
              </button>
            </div>
          </div>

          {/* Status / Commit History Area */}
          <div className="p-5 flex-1 overflow-y-auto">
             {showRecover && (
               <div className="p-3 mb-4 bg-dystopia-card/60 border border-dystopia-border rounded-sm">
                 <div className="flex items-start justify-between gap-4">
                   <div>
                     <div className="text-sm font-bold text-dystopia-accent">Saved Draft Found</div>
                     <div className="text-[12px] text-dystopia-muted">A local draft was detected for this file and branch.</div>
                   </div>
                   <div className="flex items-center gap-2">
                     <button onClick={recoverDraft} className="text-xs px-2 py-1 rounded bg-dystopia-primary text-black">Recover</button>
                     <button onClick={() => { if (confirm('Discard local draft?')) discardDraft() }} className="text-xs px-2 py-1 rounded border border-dystopia-border text-dystopia-muted">Discard</button>
                   </div>
                 </div>
               </div>
             )}

             {error && (
                <div className="p-3 mb-4 bg-dystopia-secondary/10 border border-dystopia-secondary/50 text-dystopia-secondary text-xs rounded-sm">
                    <strong className="block mb-1 uppercase tracking-wider">Error</strong>
                    {error}
                </div>
             )}

             <div>
               <h3 className="text-xs text-dystopia-muted uppercase tracking-wider mb-3">Commit History</h3>
               {commits.length === 0 ? (
                 <div className="text-[12px] text-dystopia-muted">No commits available for this file.</div>
               ) : (
                 <div className="space-y-2">
                   {commits.map((c: any) => (
                     <div key={c.sha} className="p-2 bg-black/10 border border-dystopia-border rounded-sm flex items-start justify-between gap-3 min-w-0">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-mono text-dystopia-accent truncate break-words">{c.message || c.subject || 'Commit'}</div>
                          <div className="text-[11px] text-dystopia-muted mt-1 truncate">
                            {c.author || c.committer || ''} • <span className="font-mono">{(c.sha || '').slice(0,7)}</span> • {c.date ? new Date(c.date).toLocaleString() : ''}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <button onClick={() => { if (confirm('View diff not implemented yet')) {} }} className="text-[11px] px-2 py-1 rounded border border-dystopia-border text-dystopia-muted">View</button>
                          <button onClick={() => handleRevert(c.sha)} className="text-[11px] px-2 py-1 rounded bg-dystopia-primary text-black">Revert</button>
                        </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>
          </div>
          
          {/* Footer Info */}
          <div className="p-3 border-t border-dystopia-border bg-black/20 text-[10px] text-dystopia-muted flex justify-between">
             <span>Ln {content.split('\n').length}</span>
             <span>UTF-8</span>
          </div>
        </div>
      </div>
    </div>
  )
}
