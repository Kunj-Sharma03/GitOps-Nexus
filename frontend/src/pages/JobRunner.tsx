import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getJobs, createJob, getRepos } from '../lib/api'
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
    <div className="h-screen flex flex-col bg-transparent text-dystopia-text font-mono overflow-hidden p-6 gap-6">
      {/* Floating Header */}
      <header className="h-16 shrink-0 rounded-2xl border border-dystopia-border/50 bg-dystopia-card/40 backdrop-blur-xl flex items-center px-6 justify-between shadow-2xl relative overflow-hidden z-20">
         {/* Decorative glow */}
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-dystopia-accent/50 to-transparent opacity-50"></div>
         
         {/* Left: Back & Title */}
         <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate('/')} 
              className="group flex items-center justify-center w-10 h-10 rounded-full bg-dystopia-bg/50 border border-dystopia-border hover:border-dystopia-accent/50 hover:text-dystopia-accent transition-all"
            >
              <span className="text-xl group-hover:-translate-x-0.5 transition-transform pb-1">‹</span>
            </button>
            
            <div className="flex flex-col">
               <span className="text-[10px] text-dystopia-muted uppercase tracking-widest font-bold">CI / CD Pipeline</span>
               <div className="flex items-center gap-2 text-sm font-bold text-dystopia-text tracking-wide">
                  <span className="text-dystopia-accent opacity-80">{repo?.name || 'Loading...'}</span>
                  <span className="text-dystopia-muted">/</span>
                  <span className="text-dystopia-primary">Runner</span>
               </div>
            </div>
         </div>

         {/* Right: Status */}
         <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-dystopia-accent/10 border border-dystopia-accent/20 text-dystopia-accent text-xs font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(0,255,255,0.1)]">
                <div className="w-1.5 h-1.5 rounded-full bg-dystopia-accent animate-pulse"></div>
                Runner Active
             </div>
         </div>
      </header>

      <div className="flex-1 flex overflow-hidden gap-6 z-10">
        {/* Sidebar: Job List */}
        <aside className="w-80 shrink-0 rounded-2xl border border-dystopia-border/50 bg-dystopia-card/30 backdrop-blur-xl flex flex-col shadow-2xl overflow-hidden">
          <div className="p-5 border-b border-dystopia-border/50 bg-dystopia-card/20">
            <h3 className="text-xs font-bold text-dystopia-accent uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
               <span className="w-2 h-2 bg-dystopia-accent rounded-full shadow-[0_0_8px_rgba(0,255,255,0.5)]"></span>
               New Job
            </h3>
            <form onSubmit={handleCreateJob} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase text-dystopia-muted mb-2 tracking-wider">Target Branch</label>
                <BranchSelector repoId={repoId} value={branch} onChange={setBranch} showLabel={false} />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-dystopia-muted mb-2 tracking-wider">Command</label>
                <input 
                  type="text" 
                  value={command} 
                  onChange={e => setCommand(e.target.value)}
                  className="w-full bg-black/30 border border-dystopia-border/50 rounded-lg px-3 py-2 text-xs text-dystopia-text focus:border-dystopia-accent focus:ring-1 focus:ring-dystopia-accent/50 outline-none transition-all placeholder-dystopia-muted/30"
                  placeholder="e.g. npm test"
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-dystopia-accent/20 border border-dystopia-accent/50 text-dystopia-accent text-xs font-bold uppercase tracking-[0.15em] hover:bg-dystopia-accent/30 hover:shadow-[0_0_15px_rgba(0,255,255,0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Queueing...' : 'Run Job'}
              </button>
              {error && <div className="text-red-400 text-[10px] bg-red-500/10 p-2 rounded border border-red-500/20">{error}</div>}
            </form>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
            <h3 className="text-[10px] font-bold text-dystopia-muted uppercase tracking-[0.2em] mb-3 px-2 flex items-center gap-2">
               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
               Recent Jobs
            </h3>
            <div className="space-y-2">
              {jobs.map(job => (
                <button
                  key={job.id}
                  onClick={() => setSelectedJobId(job.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all group relative overflow-hidden ${
                    selectedJobId === job.id 
                      ? 'bg-dystopia-accent/10 border-dystopia-accent/50 shadow-[0_0_10px_rgba(0,255,255,0.1)]' 
                      : 'bg-black/20 border-dystopia-border/30 hover:border-dystopia-accent/30 hover:bg-dystopia-card/40'
                  }`}
                >
                  {selectedJobId === job.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-dystopia-accent"></div>}
                  
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      job.status === 'SUCCESS' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                      job.status === 'FAILED' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                      job.status === 'RUNNING' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 animate-pulse' : 'bg-gray-500/10 text-gray-500 border border-gray-500/20'
                    }`}>{job.status}</span>
                    <span className="text-[10px] text-dystopia-muted">{new Date(job.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <div className={`text-xs font-mono truncate mb-1 ${selectedJobId === job.id ? 'text-dystopia-text' : 'text-dystopia-muted group-hover:text-dystopia-text'}`}>{job.commands[0]}</div>
                  <div className="flex items-center gap-1 text-[10px] text-dystopia-muted/60">
                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"></path></svg>
                     {job.branch}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content: Logs */}
        <main className="flex-1 relative rounded-2xl border border-dystopia-border/50 bg-dystopia-card/20 backdrop-blur-md overflow-hidden shadow-2xl flex flex-col">
          {selectedJobId ? (
            <div className="h-full flex flex-col">
              <div className="h-12 border-b border-dystopia-border/30 bg-black/20 flex items-center justify-between px-6 shrink-0 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                   <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
                   </div>
                   <div className="h-4 w-px bg-dystopia-border/30 mx-2"></div>
                   <h2 className="text-xs font-bold text-dystopia-text uppercase tracking-widest">Console Output</h2>
                </div>
                <div className="text-[10px] font-mono text-dystopia-muted">
                   ID: <span className="text-dystopia-accent">{selectedJobId}</span>
                </div>
              </div>
              
              <div className="flex-1 overflow-hidden bg-black/40 relative">
                {/* Scanline effect */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20"></div>
                <JobLogs jobId={selectedJobId} />
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-dystopia-muted/30 relative overflow-hidden">
               <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)] pointer-events-none"></div>
               <div className="w-20 h-20 border border-dystopia-accent/20 rounded-full flex items-center justify-center mb-6 animate-pulse shadow-[0_0_20px_rgba(0,255,255,0.05)] relative z-10">
                  <svg className="w-8 h-8 text-dystopia-accent/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
               </div>
               <p className="text-sm uppercase tracking-[0.2em] relative z-10">Select a job to view logs</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
