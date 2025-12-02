import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import MonacoWrapper from '../components/MonacoWrapper'
import BranchSelector from '../components/BranchSelector'
import { getFileContent, postCommit, getCommits, postRevert } from '../lib/api'
import { buildGitHubUrl, buildPermalink } from '../lib/utils'
import { Button, EmptyState, ConfirmModal, Toast } from '../components/ui'
import { useAppContext } from '../lib/AppContext'

export default function Editor() {
  const navigate = useNavigate()
  const { selectedRepo, selectedBranch, selectedPath, setSelectedBranch } = useAppContext()
  
  // Aliases for convenience
  const repoId = selectedRepo?.id
  const path = selectedPath
  const branch = selectedBranch
  const setBranch = setSelectedBranch
  const repoMeta = selectedRepo

  const [content, setContent] = useState<string>('')
  const [sha, setSha] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [message, setMessage] = useState('Update via GitOps Nexus')
  const [error, setError] = useState<string | null>(null)
  const [autosave, setAutosave] = useState(true)
  const [, setDraftExists] = useState(false)
  const [showRecover, setShowRecover] = useState(false)
  const [commits, setCommits] = useState<any[]>([])
  // editor instance stored globally on mount for keyboard shortcuts
  const [showSidebar, setShowSidebar] = useState(true)

  // UI State
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'primary';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} })

  useEffect(() => {
    if (!selectedRepo || !selectedPath) return
    setLoading(true)
    getFileContent(selectedRepo.id, selectedPath, selectedBranch)
      .then((r: any) => {
        setContent(r.content || r)
        if (r.sha) setSha(r.sha)
      })
      .catch((e) => setError(e.message || 'Failed to load file'))
      .finally(() => setLoading(false))
  }, [selectedRepo?.id, selectedPath, selectedBranch])

  // Check for saved draft when content loads
  useEffect(() => {
    if (!selectedRepo || !selectedPath) return
    const key = `draft:${selectedRepo.id}:${selectedPath}:${selectedBranch}`
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
      const res = await postCommit(repoId, path, content, message, branch, false, sha)
      console.log('save response', res)
      setDirty(false)
      
      if (res.result && res.result.content && res.result.content.sha) {
        setSha(res.result.content.sha)
      }

      setToast({ type: 'success', message: 'Saved and committed' })
    } catch (e: any) {
      if (e.message && (e.message.includes('409') || e.message.includes('Conflict'))) {
        setConfirmModal({
          isOpen: true,
          title: 'Conflict Detected',
          message: 'File has been modified on server. Overwrite anyway?',
          variant: 'danger',
          onConfirm: async () => {
            setConfirmModal(prev => ({ ...prev, isOpen: false }))
            try {
              const res = await postCommit(repoId, path, content, message, branch, false, undefined)
              setDirty(false)
              if (res.result && res.result.content && res.result.content.sha) {
                setSha(res.result.content.sha)
              }
              setToast({ type: 'success', message: 'Overwritten successfully' })
            } catch (retryErr: any) {
              setError(retryErr.message || String(retryErr))
            }
          }
        })
      } else {
        setError(e.message || String(e))
      }
    } finally {
      setLoading(false)
    }
  }, [repoId, path, content, message, branch, sha])

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
  const handleRevert = (sha: string) => {
    if (!repoId || !path) return setError('Missing context')
    
    setConfirmModal({
      isOpen: true,
      title: 'Revert Commit',
      message: `Revert to commit ${sha}? This will create a revert commit.`,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
        setLoading(true)
        try {
          await postRevert(repoId, path, sha, branch, false)
          setToast({ type: 'success', message: 'Revert committed' })
          // refresh commits after action
          const updated = await getCommits(repoId, path, 30)
          setCommits(updated.commits || updated || [])
        } catch (e: any) {
          setError(e.message || String(e))
        } finally {
          setLoading(false)
        }
      }
    })
  }

  // Quick actions
  const openInGitHub = () => {
    try {
      const url = buildGitHubUrl(repoMeta, branch, path || undefined)
      if (url) window.open(url, '_blank')
      else setToast({ type: 'error', message: 'No GitHub URL available for this repository' })
    } catch (e) {
      console.error(e)
      setToast({ type: 'error', message: 'Unable to build GitHub URL' })
    }
  }

  const copyPath = async () => {
    try {
      const txt = `${repoMeta?.name || repoId}:${path}`
      await navigator.clipboard.writeText(txt)
      setToast({ type: 'info', message: 'Path copied to clipboard' })
    } catch (e) {
      console.error(e)
      setToast({ type: 'error', message: 'Failed to copy' })
    }
  }

  const copyPermalink = async () => {
    try {
      const base = window.location.origin
      const url = buildPermalink(base, String(repoId), String(path || ''), branch)
      await navigator.clipboard.writeText(url)
      setToast({ type: 'info', message: 'Permalink copied to clipboard' })
    } catch (e) {
      console.error(e)
      setToast({ type: 'error', message: 'Failed to copy permalink' })
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
      <div className="h-full flex items-center justify-center">
        <EmptyState
          icon={<span className="text-3xl">✏️</span>}
          title="Missing Parameters"
          description="Editor requires repoId and path query parameters"
          action={<Button onClick={() => navigate(-1)} variant="primary">Go Back</Button>}
        />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col text-white overflow-hidden font-mono relative">
      {/* Toast Notification */}
      {toast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
          <Toast 
            type={toast.type as any} 
            message={toast.message} 
            onClose={() => setToast(null)} 
          />
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />

      {/* Header */}
      <header className="shrink-0 border-b border-white/10 bg-black/40 backdrop-blur-xl px-4 md:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)} 
              className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:border-green-500/50 hover:text-green-400 transition-all"
            >
              ‹
            </button>
            <div className="min-w-0">
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Editing File</p>
              <h1 className="text-sm md:text-base font-bold truncate">
                <span className="text-green-400">{repoMeta?.name || repoId}</span>
                <span className="text-white/30 mx-1">/</span>
                <span className="text-cyan-400">{path}</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(s => !s)}
              className="p-2 rounded border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-colors md:hidden"
              title="Toggle sidebar"
            >
              ☰
            </button>
            {dirty ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-bold uppercase tracking-wider animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                Unsaved
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold uppercase tracking-wider">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                Saved
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Editor Panel */}
        <div className="flex-1 flex flex-col bg-transparent overflow-hidden">
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
          <div className="shrink-0 h-7 border-t border-white/10 bg-black/40 flex items-center justify-between px-4 text-[10px] text-white/40 uppercase tracking-wider">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-cyan-400"></span>
                {path?.split('.').pop()?.toUpperCase() || 'TEXT'}
              </span>
              <span>UTF-8</span>
            </div>
            <div>Ln {content.split('\n').length}</div>
          </div>
        </div>

        {/* Sidebar Panel */}
        <aside className={`
          ${showSidebar ? 'flex' : 'hidden'} md:flex
          w-full md:w-72 lg:w-80 flex-col border-t md:border-t-0 md:border-l border-white/10 bg-black/50 backdrop-blur-xl
          fixed md:relative inset-0 top-auto h-[60vh] md:h-auto z-30 md:z-auto
        `}>
          {/* Mobile close button */}
          <button 
            onClick={() => setShowSidebar(false)}
            className="md:hidden absolute top-4 right-4 text-white/40 hover:text-white"
          >
            ✕
          </button>

          <div className="p-4 border-b border-white/10 bg-black/30">
            <h2 className="text-xs font-bold text-green-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              Commit Control
            </h2>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1">
                <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Branch</label>
                <BranchSelector repoId={repoId} value={branch} onChange={setBranch} showLabel={false} />
              </div>
              <div>
                <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Auto</label>
                <label className="flex items-center gap-2 h-[34px] px-2 rounded border border-white/10 bg-black/30 cursor-pointer">
                  <input type="checkbox" checked={autosave} onChange={(e) => setAutosave(e.target.checked)} className="accent-green-400" />
                </label>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Commit Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-black/40 border border-white/20 rounded-lg p-3 text-xs text-white focus:border-green-500/50 outline-none transition-all resize-none h-20 placeholder-white/20"
                placeholder="Describe your changes..."
              />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button onClick={openInGitHub} className="text-[10px] py-1.5 rounded border border-white/10 text-white/40 hover:text-white hover:bg-white/5 transition-colors">GitHub</button>
              <button onClick={copyPath} className="text-[10px] py-1.5 rounded border border-white/10 text-white/40 hover:text-white hover:bg-white/5 transition-colors">Path</button>
              <button onClick={copyPermalink} className="text-[10px] py-1.5 rounded border border-white/10 text-white/40 hover:text-white hover:bg-white/5 transition-colors">Link</button>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button
                disabled={loading || !dirty}
                onClick={doSave}
                variant="primary"
                size="sm"
                loading={loading}
              >
                Commit Changes
              </Button>
            </div>
          </div>

          {/* Status / Commit History Area */}
          <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
            {showRecover && (
              <div className="p-3 mb-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">Draft Found</div>
                    <div className="text-[10px] text-white/40">Local changes detected.</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={recoverDraft} variant="secondary" size="sm">Recover</Button>
                    <Button onClick={() => { 
                      setConfirmModal({
                        isOpen: true,
                        title: 'Discard Draft',
                        message: 'Are you sure you want to discard your local draft? This cannot be undone.',
                        variant: 'danger',
                        onConfirm: () => {
                          discardDraft()
                          setConfirmModal(prev => ({ ...prev, isOpen: false }))
                        }
                      })
                    }} variant="ghost" size="sm">Discard</Button>
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
              <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">History</h3>
              {commits.length === 0 ? (
                <div className="text-[10px] text-white/30 italic">No commits available.</div>
              ) : (
                <div className="space-y-2">
                  {commits.map((c: any) => (
                    <div key={c.sha} className="group p-3 bg-black/30 border border-white/10 hover:border-green-500/30 rounded-lg transition-all">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="text-xs font-bold text-white truncate group-hover:text-green-400 transition-colors">{c.message || c.subject || 'Commit'}</div>
                        <span className="font-mono text-[10px] text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded">{(c.sha || '').slice(0,7)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] text-white/40">
                          {c.author || 'Unknown'} • {c.date ? new Date(c.date).toLocaleDateString() : ''}
                        </div>
                        <button onClick={() => handleRevert(c.sha)} className="text-[10px] text-green-400 hover:underline opacity-0 group-hover:opacity-100 transition-opacity">Revert</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
