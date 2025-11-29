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
    <div className="h-screen flex flex-col bg-transparent text-dystopia-text overflow-hidden font-mono p-6 gap-6">
      {/* Floating Header */}
      <header className="h-16 shrink-0 rounded-2xl border border-dystopia-border/50 bg-dystopia-card/40 backdrop-blur-xl flex items-center px-6 justify-between shadow-2xl relative overflow-hidden z-20">
         {/* Decorative glow */}
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-dystopia-primary/50 to-transparent opacity-50"></div>
         
         {/* Left: Back & Path */}
         <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate(-1)} 
              className="group flex items-center justify-center w-10 h-10 rounded-full bg-dystopia-bg/50 border border-dystopia-border hover:border-dystopia-primary/50 hover:text-dystopia-primary transition-all"
            >
              <span className="text-xl group-hover:-translate-x-0.5 transition-transform pb-1">‹</span>
            </button>
            
            <div className="flex flex-col">
               <span className="text-[10px] text-dystopia-muted uppercase tracking-widest font-bold">Editing File</span>
               <div className="flex items-center gap-2 text-sm font-bold text-dystopia-text tracking-wide">
                  <span className="text-dystopia-primary opacity-80">{repoId}</span>
                  <span className="text-dystopia-muted">/</span>
                  <span className="text-dystopia-accent">{path}</span>
               </div>
            </div>
         </div>

         {/* Right: Status */}
         <div className="flex items-center gap-4">
            {dirty ? (
               <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-bold uppercase tracking-wider animate-pulse shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                  Unsaved Changes
               </div>
            ) : (
               <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-dystopia-primary/10 border border-dystopia-primary/20 text-dystopia-primary text-xs font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(0,255,65,0.1)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-dystopia-primary"></div>
                  All Saved
               </div>
            )}
         </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden gap-6 z-10">
        {/* Editor Panel */}
        <div className={`flex-1 relative rounded-2xl border border-dystopia-border/50 bg-dystopia-card/20 backdrop-blur-md overflow-hidden shadow-2xl flex flex-col transition-all duration-300 ${showSidebar ? '' : ''}`}>
          <div className="flex-1 relative">
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
          
          {/* Footer Info Bar */}
          <div className="h-8 border-t border-dystopia-border/30 bg-black/20 flex items-center justify-between px-4 text-[10px] text-dystopia-muted uppercase tracking-wider backdrop-blur-sm">
             <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-dystopia-accent"></span>
                  {path?.split('.').pop()?.toUpperCase() || 'TEXT'}
                </span>
                <span>UTF-8</span>
             </div>
             <div>
                Ln {content.split('\n').length}
             </div>
          </div>
        </div>

        {/* Sidebar Panel */}
        {showSidebar && (
          <div className="w-80 shrink-0 rounded-2xl border border-dystopia-border/50 bg-dystopia-card/30 backdrop-blur-xl flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-dystopia-border/50 bg-dystopia-card/20">
              <h2 className="text-xs font-bold text-dystopia-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-dystopia-primary rounded-full shadow-[0_0_8px_rgba(0,255,65,0.5)]"></span>
                Commit Control
              </h2>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1">
                  <label className="block text-[10px] text-dystopia-muted uppercase tracking-wider mb-2">Branch</label>
                  <BranchSelector repoId={repoId} value={branch} onChange={setBranch} showLabel={false} />
                </div>
                <div className="w-28">
                  <label className="block text-[10px] text-dystopia-muted uppercase tracking-wider mb-2">Autosave</label>
                  <div className="flex items-center gap-2 h-[34px] px-2 rounded border border-dystopia-border/50 bg-black/20">
                    <input id="autosave" type="checkbox" checked={autosave} onChange={(e) => setAutosave(e.target.checked)} className="accent-dystopia-primary" />
                    <label htmlFor="autosave" className="text-[10px] text-dystopia-muted cursor-pointer select-none">Enabled</label>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-[10px] text-dystopia-muted uppercase tracking-wider mb-2">Commit Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-black/30 border border-dystopia-border/50 rounded-lg p-3 text-xs text-dystopia-text focus:border-dystopia-primary focus:ring-1 focus:ring-dystopia-primary/50 outline-none transition-all resize-none h-24 placeholder-dystopia-muted/30"
                  placeholder="Describe your changes..."
                />
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <button onClick={openInGitHub} className="text-[10px] py-1.5 rounded border border-dystopia-border/50 text-dystopia-muted hover:text-dystopia-text hover:bg-dystopia-card/40 transition-colors">GitHub</button>
                <button onClick={copyPath} className="text-[10px] py-1.5 rounded border border-dystopia-border/50 text-dystopia-muted hover:text-dystopia-text hover:bg-dystopia-card/40 transition-colors">Copy Path</button>
                <button onClick={copyPermalink} className="text-[10px] py-1.5 rounded border border-dystopia-border/50 text-dystopia-muted hover:text-dystopia-text hover:bg-dystopia-card/40 transition-colors">Permalink</button>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-3 h-3 rounded-sm border flex items-center justify-center transition-colors ${dryRun ? 'bg-dystopia-primary border-dystopia-primary' : 'border-dystopia-muted group-hover:border-dystopia-text'}`}>
                       {dryRun && <svg className="w-2 h-2 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                    </div>
                    <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} className="hidden" />
                    <span className="text-xs text-dystopia-muted group-hover:text-dystopia-text transition-colors">Dry run</span>
                  </label>
                  
                  {(!autosave || showRecover) && (
                    <button onClick={() => saveDraft('manual')} className="text-[10px] px-2 py-1 rounded bg-dystopia-card/40 border border-dystopia-border/40 hover:bg-dystopia-primary/10 hover:text-dystopia-primary transition-colors">Draft</button>
                  )}
                </div>

                <button
                  disabled={loading || !dirty}
                  onClick={doSave}
                  className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-[0.12em] transition-all shadow-lg ${loading ? 'bg-dystopia-muted/20 text-dystopia-muted' : dirty ? 'bg-dystopia-primary text-black hover:bg-dystopia-primary/90 hover:shadow-[0_0_15px_rgba(0,255,65,0.3)]' : 'bg-dystopia-border/30 text-dystopia-muted'}`}
                >
                  {loading ? 'Processing…' : (dryRun ? 'Verify' : 'Commit')}
                </button>
              </div>
            </div>

            {/* Status / Commit History Area */}
            <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
               {showRecover && (
                 <div className="p-3 mb-4 bg-dystopia-accent/10 border border-dystopia-accent/30 rounded-lg">
                   <div className="flex items-start justify-between gap-4">
                     <div>
                       <div className="text-xs font-bold text-dystopia-accent uppercase tracking-wider mb-1">Draft Found</div>
                       <div className="text-[10px] text-dystopia-muted">Local changes detected.</div>
                     </div>
                     <div className="flex items-center gap-2">
                       <button onClick={recoverDraft} className="text-[10px] px-2 py-1 rounded bg-dystopia-accent text-black font-bold">Recover</button>
                       <button onClick={() => { if (confirm('Discard local draft?')) discardDraft() }} className="text-[10px] px-2 py-1 rounded border border-dystopia-accent/30 text-dystopia-accent hover:bg-dystopia-accent/10">Discard</button>
                     </div>
                   </div>
                 </div>
               )}

               {error && (
                  <div className="p-3 mb-4 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg">
                      <strong className="block mb-1 uppercase tracking-wider font-bold">Error</strong>
                      {error}
                  </div>
               )}

               <div>
                 <h3 className="text-[10px] font-bold text-dystopia-muted uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    History
                 </h3>
                 {commits.length === 0 ? (
                   <div className="text-[10px] text-dystopia-muted italic opacity-50">No commits available.</div>
                 ) : (
                   <div className="space-y-2">
                     {commits.map((c: any) => (
                       <div key={c.sha} className="group p-3 bg-black/20 border border-dystopia-border/30 hover:border-dystopia-primary/30 rounded-lg transition-all">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="text-xs font-bold text-dystopia-text truncate group-hover:text-dystopia-primary transition-colors">{c.message || c.subject || 'Commit'}</div>
                            <span className="font-mono text-[10px] text-dystopia-accent bg-dystopia-accent/10 px-1.5 py-0.5 rounded">{(c.sha || '').slice(0,7)}</span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                             <div className="text-[10px] text-dystopia-muted">
                               {c.author || 'Unknown'} • {c.date ? new Date(c.date).toLocaleDateString() : ''}
                             </div>
                             <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleRevert(c.sha)} className="text-[10px] text-dystopia-primary hover:underline">Revert</button>
                             </div>
                          </div>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
