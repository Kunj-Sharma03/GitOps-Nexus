import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getJobs, createJob, getBranches, getRepos } from '../lib/api'
import { JobLogs } from '../components/JobLogs'
import BranchSelector from '../components/BranchSelector'

export default function JobRunner() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const repoId = searchParams.get('repoId')
  
  const [repo, setRepo] = useState<any>(null)
  const [jobs, setJobs] = useState<any[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [branch, setBranch] = useState('main')
  const [command, setCommand] = useState('npm test')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!repoId) return
    // Fetch repo details (we can reuse getRepos and find it, or add getRepo endpoint)
    // For now let's just fetch all repos and find it, or assume we have it if passed in state
    // Better: fetch jobs which will confirm repo exists
    loadJobs()
    
    getRepos().then(data => {
      const r = data.repos.find((x: any) => x.id === repoId)
      if (r) {
        setRepo(r)
        setBranch(r.defaultBranch || 'main')
      }
    })
  }, [repoId])

  const loadJobs = () => {
    if (!repoId) return
    getJobs(repoId).then(data => {
      setJobs(data.jobs)
      if (data.jobs.length > 0 && !selectedJobId) {
        setSelectedJobId(data.jobs[0].id)
      }
    }).catch(err => setError(err.message))
  }

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!repoId) return
    setLoading(true)
    setError('')
    try {
      const res = await createJob(repoId, command, branch)
      await loadJobs()
      setSelectedJobId(res.jobId)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!repoId) return <div className="p-8 text-center text-dystopia-muted">No repository selected</div>

  return (
    <div className="h-screen flex flex-col bg-dystopia-bg text-dystopia-text font-mono overflow-hidden">
      {/* Header */}
      <header className="h-12 border-b border-dystopia-border flex items-center px-4 justify-between bg-dystopia-card/80 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-dystopia-muted hover:text-dystopia-primary transition-colors">
            &larr; Back
          </button>
          <h1 className="text-sm font-bold tracking-widest text-dystopia-text uppercase">
            CI Runner <span className="text-dystopia-muted font-normal text-[10px] ml-2">{repo?.name}</span>
          </h1>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: Job List */}
        <aside className="w-80 flex flex-col border-r border-dystopia-border bg-dystopia-card/20 backdrop-blur-sm">
          <div className="p-4 border-b border-dystopia-border/50">
            <h3 className="text-xs font-bold text-dystopia-muted uppercase tracking-wider mb-4">New Job</h3>
            <form onSubmit={handleCreateJob} className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase text-dystopia-muted mb-1">Branch</label>
                <BranchSelector repoId={repoId} value={branch} onChange={setBranch} showLabel={false} />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-dystopia-muted mb-1">Command</label>
                <input 
                  type="text" 
                  value={command} 
                  onChange={e => setCommand(e.target.value)}
                  className="w-full bg-dystopia-bg border border-dystopia-border rounded px-2 py-1 text-xs text-dystopia-text focus:border-dystopia-primary outline-none"
                  placeholder="e.g. npm test"
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-1.5 bg-dystopia-primary/20 border border-dystopia-primary/50 text-dystopia-primary text-xs uppercase tracking-wider hover:bg-dystopia-primary/30 transition-all disabled:opacity-50"
              >
                {loading ? 'Queueing...' : 'Run Job'}
              </button>
              {error && <div className="text-red-500 text-[10px]">{error}</div>}
            </form>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            <h3 className="text-[10px] font-bold text-dystopia-muted uppercase tracking-wider mb-2 px-2">Recent Jobs</h3>
            <div className="space-y-1">
              {jobs.map(job => (
                <button
                  key={job.id}
                  onClick={() => setSelectedJobId(job.id)}
                  className={`w-full text-left px-3 py-2 rounded text-xs border transition-all ${
                    selectedJobId === job.id 
                      ? 'bg-dystopia-primary/10 border-dystopia-primary/50 text-dystopia-primary' 
                      : 'bg-transparent border-transparent hover:bg-dystopia-card/30 text-dystopia-muted'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`font-bold ${
                      job.status === 'SUCCESS' ? 'text-green-500' :
                      job.status === 'FAILED' ? 'text-red-500' :
                      job.status === 'RUNNING' ? 'text-yellow-500' : 'text-gray-500'
                    }`}>{job.status}</span>
                    <span className="text-[10px] opacity-60">{new Date(job.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="truncate opacity-80">{job.commands[0]}</div>
                  <div className="text-[10px] opacity-50 mt-1">{job.branch}</div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content: Logs */}
        <main className="flex-1 flex flex-col bg-dystopia-bg relative p-4">
          {selectedJobId ? (
            <div className="h-full flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-dystopia-text">Job Logs <span className="text-dystopia-muted text-sm font-normal">{selectedJobId}</span></h2>
                <div className="flex gap-2">
                   {/* Could add cancel button here later */}
                </div>
              </div>
              <div className="flex-1 overflow-hidden border border-dystopia-border rounded bg-black">
                <JobLogs jobId={selectedJobId} />
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-dystopia-muted/50">
              <p>Select a job to view logs</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
