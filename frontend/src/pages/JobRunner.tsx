import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getJobs, createJob } from '../lib/api'
import { JobLogs } from '../components/JobLogs'
import BranchSelector from '../components/BranchSelector'
import { Button, StatusBadge, EmptyState } from '../components/ui'
import { useAppContext } from '../lib/AppContext'

export default function JobRunner() {
  const navigate = useNavigate()
  const { selectedRepo, selectedBranch, setSelectedBranch } = useAppContext()
  
  const [jobs, setJobs] = useState<any[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [command, setCommand] = useState('npm test')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')

  useEffect(() => {
    if (!selectedRepo) return
    loadJobs()
    
    // Poll for job status updates every 3 seconds
    const interval = setInterval(loadJobs, 3000)
    return () => clearInterval(interval)
  }, [selectedRepo?.id])

  const loadJobs = () => {
    if (!selectedRepo) return
    getJobs(selectedRepo.id).then(data => {
      setJobs(data.jobs)
      if (data.jobs.length > 0 && !selectedJobId) {
        setSelectedJobId(data.jobs[0].id)
      }
    }).catch(err => setError(err.message))
  }

  const selectedJob = jobs.find(j => j.id === selectedJobId)

  const handleDownloadArtifacts = async () => {
    if (!selectedJobId) return
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:3000/api/jobs/${selectedJobId}/artifacts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `artifacts-${selectedJobId}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (err) {
      console.error(err)
      alert('Failed to download artifacts')
    }
  }

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRepo) return
    setLoading(true)
    setError('')
    try {
      const res = await createJob(selectedRepo.id, command, selectedBranch)
      await loadJobs()
      setSelectedJobId(res.jobId)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!selectedRepo) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState
          icon={<span className="text-3xl">⚡</span>}
          title="No Repository Selected"
          description="Select a repository from the Repos page to run CI/CD jobs"
          action={<Button onClick={() => navigate('/')} variant="primary">Go to Repos</Button>}
        />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col text-white font-mono overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-white/10 bg-black/40 backdrop-blur-xl px-4 md:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')} 
              className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:border-cyan-500/50 hover:text-cyan-400 transition-all"
            >
              ‹
            </button>
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">CI / CD Pipeline</p>
              <h1 className="text-lg font-bold">
                <span className="text-cyan-400">{selectedRepo?.name || 'Loading...'}</span>
                <span className="text-white/30 mx-2">/</span>
                <span className="text-green-400">Runner</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
            Runner Active
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar: Job List */}
        <aside className="w-full md:w-72 lg:w-80 flex flex-col border-b md:border-b-0 md:border-r border-white/10 bg-black/50 backdrop-blur-xl max-h-64 md:max-h-none overflow-hidden">
          {/* New Job Form */}
          <div className="p-4 border-b border-white/10 bg-black/30">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
              New Job
            </h3>
            <form onSubmit={handleCreateJob} className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase text-white/40 mb-1.5 tracking-wider">Branch</label>
                <BranchSelector repoId={selectedRepo.id} value={selectedBranch} onChange={setSelectedBranch} showLabel={false} />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-white/40 mb-1.5 tracking-wider">Command</label>
                <input 
                  type="text" 
                  value={command} 
                  onChange={e => setCommand(e.target.value)}
                  className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500/50 outline-none transition-all placeholder-white/20"
                  placeholder="e.g. npm test"
                />
              </div>
              <Button type="submit" variant="secondary" className="w-full" loading={loading}>
                Run Job
              </Button>
              {error && <div className="text-red-400 text-[10px] bg-red-500/10 p-2 rounded border border-red-500/20">{error}</div>}
            </form>
          </div>
          
          {/* Job List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                Recent Jobs
              </h3>
              <select 
                value={filterStatus} 
                onChange={e => setFilterStatus(e.target.value)}
                className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] text-white/60 focus:border-cyan-500/50 outline-none"
              >
                <option value="ALL">All</option>
                <option value="SUCCESS">Success</option>
                <option value="FAILED">Failed</option>
                <option value="RUNNING">Running</option>
                <option value="QUEUED">Queued</option>
              </select>
            </div>

            <div className="space-y-2">
              {jobs.filter(job => filterStatus === 'ALL' || job.status === filterStatus).map(job => (
                <button
                  key={job.id}
                  onClick={() => setSelectedJobId(job.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all group relative overflow-hidden ${
                    selectedJobId === job.id 
                      ? 'bg-cyan-500/10 border-cyan-500/50' 
                      : 'bg-black/10 border-white/5 hover:border-cyan-500/30 hover:bg-white/5'
                  }`}
                >
                  {selectedJobId === job.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400"></div>}
                  
                  <div className="flex justify-between items-center mb-2">
                    <StatusBadge status={job.status} />
                    <span className="text-[10px] text-white/40">{new Date(job.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <div className={`text-xs font-mono truncate mb-1 ${selectedJobId === job.id ? 'text-white' : 'text-white/60 group-hover:text-white'}`}>
                    {job.commands[0]}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-white/30">
                    <span>#</span> {job.branch}
                  </div>
                </button>
              ))}
              {jobs.length === 0 && (
                <div className="text-center py-8 text-white/30 text-xs">
                  No jobs yet. Create one above.
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content: Logs */}
        <main className="flex-1 flex flex-col bg-transparent overflow-hidden">
          {selectedJobId ? (
            <>
              {/* Log Header */}
              <div className="shrink-0 border-b border-white/10 bg-black/40 flex items-center justify-between px-4 md:px-6 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500/30 border border-red-500/50"></div>
                    <div className="w-2 h-2 rounded-full bg-yellow-500/30 border border-yellow-500/50"></div>
                    <div className="w-2 h-2 rounded-full bg-green-500/30 border border-green-500/50"></div>
                  </div>
                  <span className="text-xs font-bold text-white uppercase tracking-widest hidden sm:inline">Console Output</span>
                </div>
                <div className="flex items-center gap-4">
                  {selectedJob?.artifactsPath && (
                    <Button onClick={handleDownloadArtifacts} variant="ghost" size="sm">
                      ↓ Artifacts
                    </Button>
                  )}
                  <span className="text-[10px] font-mono text-white/40">
                    ID: <span className="text-cyan-400">{selectedJobId.slice(0, 12)}...</span>
                  </span>
                </div>
              </div>
              
              {/* Log Content */}
              <div className="flex-1 overflow-hidden bg-black/50 relative">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_2px] pointer-events-none opacity-10 z-10"></div>
                <JobLogs jobId={selectedJobId} />
              </div>
            </>
          ) : (
            <EmptyState
              icon={<span className="text-3xl">⚡</span>}
              title="No Job Selected"
              description="Select a job from the list to view its console output"
            />
          )}
        </main>
      </div>
    </div>
  )
}
