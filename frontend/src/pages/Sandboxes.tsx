import { useState, useEffect } from 'react'
import { getSessions, createSession, deleteSession, getRepos } from '../lib/api'
import { Terminal } from '../components/Terminal'
import { Button, StatusBadge, GlassCard, EmptyState, Skeleton, ConfirmModal, Toast } from '../components/ui'

export default function Sandboxes() {
  const [sessions, setSessions] = useState<any[]>([])
  const [repos, setRepos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedRepoId, setSelectedRepoId] = useState<string>('')
  const [ttl, setTtl] = useState(30)
  const [creating, setCreating] = useState(false)
  const [terminalSessionId, setTerminalSessionId] = useState<string | null>(null)
  
  // UI State
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
    variant?: 'danger' | 'primary';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: async () => {},
  })

  const loadData = async () => {
    try {
      const [sessData, repoData] = await Promise.all([getSessions(), getRepos()])
      setSessions(sessData.sessions || [])
      setRepos(repoData.repos || repoData || [])
    } catch (err) {
      console.error('Failed to load data', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // Poll for status updates every 5 seconds
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      await createSession(selectedRepoId || undefined, ttl)
      await loadData()
      setIsCreateOpen(false)
      setSelectedRepoId('')
      setToast({ type: 'success', message: 'Sandbox launched successfully' })
    } catch (err: any) {
      setToast({ type: 'error', message: 'Failed to create session: ' + (err.message || String(err)) })
    } finally {
      setCreating(false)
    }
  }

  const confirmTerminate = (id: string) => {
    setConfirmAction({
      isOpen: true,
      title: 'Terminate Sandbox',
      message: 'Are you sure you want to terminate this sandbox? This action cannot be undone and all data in the container will be lost.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteSession(id)
          await loadData()
          setConfirmAction(prev => ({ ...prev, isOpen: false }))
          setToast({ type: 'success', message: 'Sandbox terminated' })
        } catch (err: any) {
          setToast({ type: 'error', message: 'Failed to terminate session: ' + (err.message || String(err)) })
        }
      }
    })
  }

  return (
    <div className="h-full flex flex-col text-white font-mono overflow-hidden relative">
      {/* Toast Notification */}
      {toast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60]">
          <Toast 
            type={toast.type as any} 
            message={toast.message} 
            onClose={() => setToast(null)} 
          />
        </div>
      )}

      {/* Header */}
      <header className="shrink-0 border-b border-white/10 bg-black/40 backdrop-blur-xl px-4 md:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              Sandbox <span className="text-green-400">Environments</span>
            </h1>
            <p className="text-white/40 text-xs uppercase tracking-widest mt-1">
              Ephemeral Container Orchestration
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} variant="primary" size="md">
            + Launch Sandbox
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {loading && sessions.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <GlassCard key={i} padding="lg">
                <Skeleton className="h-4 w-24 mb-4" />
                <Skeleton className="h-6 w-full mb-4" />
                <Skeleton className="h-4 w-32" />
              </GlassCard>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={<span className="text-3xl">📦</span>}
            title="No Active Sessions"
            description="Launch a new ephemeral sandbox to begin an isolated workspace session"
            action={
              <Button onClick={() => setIsCreateOpen(true)} variant="primary">
                + Launch Sandbox
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map(session => (
              <GlassCard key={session.id} className="group hover:border-green-500/30 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <StatusBadge status={session.status} />
                  <span className="text-[10px] text-white/40 font-mono">{session.id.slice(-8)}</span>
                </div>
                
                <div className="mb-4">
                  <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Repository</div>
                  <div className="text-sm font-bold text-cyan-400 truncate">
                    {repos.find(r => r.id === session.repoId)?.name || 'Empty Workspace'}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Expires At</div>
                  <div className="text-xs font-mono text-white/80">
                    {new Date(session.expiresAt).toLocaleString()}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-white/10">
                  {session.status === 'RUNNING' && (
                    <Button 
                      variant="ghost"
                      size="sm"
                      onClick={() => setTerminalSessionId(session.id)}
                    >
                      Open Terminal
                    </Button>
                  )}
                  <Button 
                    onClick={() => confirmTerminate(session.id)}
                    variant="danger"
                    size="sm"
                    className="ml-auto"
                  >
                    Terminate
                  </Button>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </main>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmAction.isOpen}
        onClose={() => setConfirmAction(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmAction.onConfirm}
        title={confirmAction.title}
        message={confirmAction.message}
        variant={confirmAction.variant}
        confirmText="Terminate"
      />

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <GlassCard className="w-full max-w-md relative" padding="lg">
            <button 
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white"
            >
              ✕
            </button>
            <h2 className="text-lg font-bold text-white mb-6 uppercase tracking-widest">Launch Sandbox</h2>
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block text-[10px] uppercase text-white/40 mb-2 tracking-wider">Base Repository (Optional)</label>
                <select 
                  value={selectedRepoId}
                  onChange={e => setSelectedRepoId(e.target.value)}
                  className="w-full bg-black/50 border border-white/20 rounded-lg p-3 text-sm text-white focus:border-green-500/50 outline-none transition-colors"
                >
                  <option value="">-- Empty Workspace --</option>
                  {repos.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="mb-6">
                <label className="block text-[10px] uppercase text-white/40 mb-2 tracking-wider">Duration (Minutes)</label>
                <input 
                  type="number" 
                  min="5" 
                  max="120"
                  value={ttl}
                  onChange={e => setTtl(Number(e.target.value))}
                  className="w-full bg-black/50 border border-white/20 rounded-lg p-3 text-sm text-white focus:border-green-500/50 outline-none transition-colors"
                />
                <div className="text-[10px] text-white/40 mt-1">Max 120 minutes</div>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={creating}>
                  Launch Container
                </Button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* Terminal Modal */}
      {terminalSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
          {/* Backdrop with blur */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => setTerminalSessionId(null)}
          />
          
          {/* Terminal container */}
          <div className="relative w-full max-w-5xl h-[80vh] md:h-[70vh] animate-in fade-in zoom-in-95 duration-200">
            <Terminal 
              sessionId={terminalSessionId} 
              onClose={() => setTerminalSessionId(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
