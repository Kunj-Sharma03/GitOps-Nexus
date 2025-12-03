import { useState, useEffect } from 'react'
import { postCommit, getFileContent } from '../lib/api'
import { Toast, ConfirmModal } from './ui'

const SIZE_LIMIT = 200 * 1024 // 200KB

export default function CommitPanel({ repoId, branch, selectedPath, onSuccess }: { repoId: string | null, branch: string, selectedPath?: string, onSuccess?: (res: any) => void }) {
  const [message, setMessage] = useState('Update via GitOps Nexus')
  const [content, setContent] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCommit, setLastCommit] = useState<any>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void } | null>(null)

  useEffect(() => {
    setContent(undefined)
    setError(null)
    if (!repoId || !selectedPath) return
    getFileContent(repoId, selectedPath, branch)
      .then((r: any) => setContent(r.content || r))
      .catch((e: Error) => setError(e.message))
  }, [repoId, selectedPath, branch])

  const doCommit = () => {
    if (!repoId || !selectedPath) return setError('No file selected')
    const bytes = new TextEncoder().encode(content || '').length
    if (bytes > SIZE_LIMIT) return setError(`File too large (${bytes} bytes). Limit ${SIZE_LIMIT} bytes.`)
    
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Commit',
      message: `Are you sure you want to commit changes to ${selectedPath}?`,
      onConfirm: executeCommit
    })
  }

  const executeCommit = async () => {
    if (!repoId || !selectedPath) return

    setLoading(true)
    setError(null)
    try {
      const res = await postCommit(repoId, selectedPath, content || '', message, branch, false)
      console.log('commit response', res)
      
      // Real commit - refresh file content
      try {
        const fresh = await getFileContent(repoId, selectedPath!, branch)
        setError(null)
        if (onSuccess) onSuccess({ result: res, refreshed: fresh })
        const sha = res.result?.commit?.sha || 'unknown'
        setLastCommit(res.result) // Store the commit for display
        setToast({ type: 'success', message: `Commit successful! SHA: ${sha.substring(0, 7)}...` })
      } catch (refreshErr) {
        setError('Commit succeeded but failed to refresh content')
        if (onSuccess) onSuccess({ result: res, refreshed: null })
      }
    } catch (e: any) {
      console.error('Commit error:', e)
      setError(e.message || String(e))
      setToast({ type: 'error', message: e.message || 'Commit failed' })
    } finally {
      setLoading(false)
      setConfirmModal(null)
    }
  }

  return (
    <div className="p-3 bg-dystopia-card/30 border border-dystopia-border/50 rounded-md space-y-3">
      <div className="text-xs text-dystopia-muted">Commit</div>
      <div className="text-xs text-dystopia-muted">Target: <span className="text-dystopia-primary font-mono">{selectedPath || '—'}</span></div>
      
      <div>
        <label className="block text-xs text-dystopia-muted mb-1">File Content:</label>
        <textarea 
          className="w-full bg-dystopia-bg/40 p-2 rounded text-sm text-dystopia-text font-mono h-32 resize-y" 
          value={content || ''} 
          onChange={e => setContent(e.target.value)}
          placeholder="File content will load here..."
        />
      </div>
      
      <div>
        <label className="block text-xs text-dystopia-muted mb-1">Commit Message:</label>
        <textarea className="w-full bg-dystopia-bg/40 p-2 rounded text-sm text-dystopia-text h-16 resize-y" value={message} onChange={e => setMessage(e.target.value)} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-dystopia-muted">Size: <span className="font-mono">{content ? new TextEncoder().encode(content).length : 0} bytes</span></div>
      </div>
      {error && <div className="text-dystopia-secondary text-sm">{error}</div>}
      <div className="flex gap-2">
        <button disabled={loading || !selectedPath} onClick={doCommit} className="px-3 py-2 rounded bg-dystopia-primary/10 hover:bg-dystopia-primary/20 text-dystopia-primary font-semibold">
          {loading ? 'Working…' : 'Commit'}
        </button>
        <button onClick={() => { setMessage('Update via GitOps Nexus'); setLastCommit(null) }} className="px-3 py-2 rounded border border-dystopia-border/50 text-dystopia-muted">Reset</button>
      </div>
      
      {lastCommit && lastCommit.commit && (
        <div className="p-2 bg-dystopia-primary/10 border border-dystopia-primary/30 rounded text-xs">
          <div className="text-dystopia-primary font-semibold">Last commit: {lastCommit.commit.sha.substring(0, 7)}</div>
          {lastCommit.commit.html_url && (
            <a href={lastCommit.commit.html_url} target="_blank" rel="noopener noreferrer" className="text-dystopia-accent hover:underline">
              View on GitHub →
            </a>
          )}
        </div>
      )}

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onClose={() => setConfirmModal(null)}
        />
      )}
    </div>
  )
}
