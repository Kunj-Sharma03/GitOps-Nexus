import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSessions, createSession, deleteSession, getRepos } from '../lib/api'
import { Terminal } from '../components/Terminal'

export default function Sandboxes() {
  const [sessions, setSessions] = useState<any[]>([])
  const [repos, setRepos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedRepoId, setSelectedRepoId] = useState<string>('')
  const [ttl, setTtl] = useState(30)
  const [creating, setCreating] = useState(false)
  const [terminalSessionId, setTerminalSessionId] = useState<string | null>(null)
  
  const navigate = useNavigate()

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
    } catch (err) {
      alert('Failed to create session: ' + err)
    } finally {
      setCreating(false)
    }
  }

  const handleTerminate = async (id: string) => {
    if (!confirm('Are you sure you want to terminate this sandbox?')) return
    try {
      await deleteSession(id)
      await loadData()
    } catch (err) {
      alert('Failed to terminate session: ' + err)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-dystopia-bg text-dystopia-text font-mono overflow-hidden relative">
       {/* Background Grid */}
       <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,65,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,65,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)] pointer-events-none"></div>

      {/* Header */}
      <header className="shrink-0 z-10 border-b border-dystopia-border bg-dystopia-card/20 backdrop-blur-md flex items-center justify-between px-8 py-6">
        <div>
            <h1 className="text-4xl font-black tracking-tighter text-white mb-1 drop-shadow-[0_0_15px_rgba(0,255,65,0.2)]">
                SANDBOX <span className="text-dystopia-primary">ENVIRONMENTS</span>
            </h1>
            <p className="text-dystopia-muted text-xs uppercase tracking-[0.3em]">
                Ephemeral Container Orchestration
            </p>
        </div>
        <div className="flex items-center gap-4">
            <button 
                onClick={() => navigate('/')}
                className="px-4 py-2 text-dystopia-muted hover:text-dystopia-text text-xs uppercase tracking-wider"
            >
                Back to Nexus
            </button>
            <button 
                onClick={() => setIsCreateOpen(true)}
                className="px-6 py-3 bg-dystopia-primary/10 border border-dystopia-primary/50 text-dystopia-primary text-xs font-bold uppercase tracking-[0.2em] hover:bg-dystopia-primary/20 transition-all"
            >
                + Launch Sandbox
            </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-8 relative z-10">
        {loading && sessions.length === 0 ? (
            <div className="text-center text-dystopia-muted mt-20">Initializing uplink...</div>
        ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-dystopia-muted/50">
                <div className="w-16 h-16 border border-dystopia-primary/30 rounded-full flex items-center justify-center mb-6">
                    <div className="w-2 h-2 bg-dystopia-primary rounded-full"></div>
                </div>
                <h2 className="text-xl font-bold tracking-widest uppercase mb-2">No Active Sessions</h2>
                <p className="text-xs max-w-md text-center">
                    Launch a new ephemeral sandbox to begin an isolated workspace session.
                </p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sessions.map(session => (
                    <div key={session.id} className="bg-dystopia-card/10 border border-dystopia-border p-6 relative group hover:border-dystopia-primary/50 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                    session.status === 'RUNNING' ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' :
                                    session.status === 'STARTING' ? 'bg-yellow-500 animate-pulse' :
                                    'bg-red-500'
                                }`}></div>
                                <span className="text-xs font-bold text-dystopia-text tracking-wider">{session.status}</span>
                            </div>
                            <span className="text-[10px] text-dystopia-muted font-mono">{session.id.slice(-8)}</span>
                        </div>
                        
                        <div className="mb-6 space-y-2">
                            <div className="text-xs text-dystopia-muted uppercase tracking-wider">Repository</div>
                            <div className="text-sm font-bold text-dystopia-accent truncate">
                                {repos.find(r => r.id === session.repoId)?.name || 'Empty Workspace'}
                            </div>
                        </div>

                        <div className="mb-6 space-y-2">
                            <div className="text-xs text-dystopia-muted uppercase tracking-wider">Expires At</div>
                            <div className="text-xs font-mono text-dystopia-text">
                                {new Date(session.expiresAt).toLocaleString()}
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-dystopia-border/30">
                            {session.status === 'RUNNING' && (
                                <button 
                                    className="text-xs text-dystopia-primary hover:underline uppercase tracking-wider"
                                    onClick={() => setTerminalSessionId(session.id)}
                                >
                                    Open Terminal
                                </button>
                            )}
                            <button 
                                onClick={() => handleTerminate(session.id)}
                                className="text-xs text-red-500 hover:text-red-400 uppercase tracking-wider ml-auto"
                            >
                                Terminate
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </main>

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dystopia-bg border border-dystopia-border w-full max-w-md p-6 shadow-2xl relative">
            <button 
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 text-dystopia-muted hover:text-dystopia-text"
            >
              ✕
            </button>
            <h2 className="text-lg font-bold text-dystopia-text mb-6 uppercase tracking-widest">Launch Sandbox</h2>
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block text-[10px] uppercase text-dystopia-muted mb-2">Base Repository (Optional)</label>
                <select 
                  value={selectedRepoId}
                  onChange={e => setSelectedRepoId(e.target.value)}
                  className="w-full bg-black/50 border border-dystopia-border p-2 text-sm text-dystopia-text focus:border-dystopia-primary outline-none"
                >
                    <option value="">-- Empty Workspace --</option>
                    {repos.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                </select>
              </div>
              
              <div className="mb-6">
                <label className="block text-[10px] uppercase text-dystopia-muted mb-2">Duration (Minutes)</label>
                <input 
                  type="number" 
                  min="5" 
                  max="120"
                  value={ttl}
                  onChange={e => setTtl(Number(e.target.value))}
                  className="w-full bg-black/50 border border-dystopia-border p-2 text-sm text-dystopia-text focus:border-dystopia-primary outline-none"
                />
                <div className="text-[10px] text-dystopia-muted mt-1">Max 120 minutes</div>
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs uppercase tracking-wider text-dystopia-muted hover:text-dystopia-text"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-dystopia-primary/20 border border-dystopia-primary/50 text-dystopia-primary text-xs uppercase tracking-wider hover:bg-dystopia-primary/30 disabled:opacity-50"
                >
                  {creating ? 'Launching...' : 'Launch Container'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Terminal Modal */}
      {terminalSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          {/* Backdrop with blur */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => setTerminalSessionId(null)}
          />
          
          {/* Terminal container */}
          <div className="relative w-full max-w-5xl h-[70vh] animate-in fade-in zoom-in-95 duration-200">
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
