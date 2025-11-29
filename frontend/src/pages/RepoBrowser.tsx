import { useState, useEffect } from 'react'
import UnifiedExplorer from '../components/UnifiedExplorer'
import BranchSelector from '../components/BranchSelector'
import FileViewer from '../components/FileViewer'
import { getFileContent, createRepo } from '../lib/api'
import { buildGitHubUrl, buildPermalink } from '../lib/utils'

import { useNavigate } from 'react-router-dom'

export default function RepoBrowser() {
  const [selectedRepo, setSelectedRepo] = useState<any | null>(null)
  const [branch, setBranch] = useState<string>('main')
  const [selectedPath, setSelectedPath] = useState<string | undefined>(undefined)
  const [fileContent, setFileContent] = useState<string | undefined>(undefined)
  
  // Add Repo State
  const [isAddRepoOpen, setIsAddRepoOpen] = useState(false)
  const [newRepoUrl, setNewRepoUrl] = useState('')
  const [isAddingRepo, setIsAddingRepo] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const navigate = useNavigate()

  useEffect(() => {
    if (!selectedRepo || !selectedPath) return
    setFileContent(undefined)
    getFileContent(selectedRepo.id, selectedPath, branch)
      .then((r: any) => setFileContent(r.content || r))
      .catch(() => setFileContent('// failed to load'))
  }, [selectedRepo, selectedPath, branch])

  const handleRepoSelect = (repo: any) => {
    setSelectedRepo(repo)
    setSelectedPath(undefined)
    setFileContent(undefined)
    setBranch(repo.defaultBranch || 'main')
  }

  const handleFileSelect = (repoId: string, path: string) => {
    // Make sure the correct repo is selected when selecting a file
    if (!selectedRepo || selectedRepo.id !== repoId) {
      // Need to find the repo object - this should be handled by UnifiedExplorer
      console.warn('File selected but repo not properly set. RepoId:', repoId, 'Current repo:', selectedRepo?.id)
    }
    setSelectedPath(path)
  }

  const handleAddRepo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRepoUrl) return
    
    setIsAddingRepo(true)
    try {
      await createRepo(newRepoUrl)
      setRefreshKey(k => k + 1)
      setIsAddRepoOpen(false)
      setNewRepoUrl('')
    } catch (err) {
      alert('Failed to add repo: ' + err)
    } finally {
      setIsAddingRepo(false)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-dystopia-bg text-dystopia-text font-mono overflow-hidden">
      {/* Header */}
      <header className="h-12 border-b border-dystopia-border flex items-center px-4 justify-between bg-dystopia-card/80 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 bg-dystopia-primary/20 rounded flex items-center justify-center border border-dystopia-primary/50">
            <span className="text-dystopia-primary font-bold text-xs">GN</span>
          </div>
          <h1 className="text-sm font-bold tracking-widest text-dystopia-text uppercase">
            GitOps Nexus <span className="text-dystopia-muted font-normal text-[10px] ml-2">v1.0.0</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
           <button 
             onClick={() => setIsAddRepoOpen(true)}
             className="px-3 py-1 bg-dystopia-primary/10 border border-dystopia-primary/30 text-dystopia-primary text-[10px] uppercase tracking-wider hover:bg-dystopia-primary/20 transition-all"
           >
             + Add Repo
           </button>
           <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-dystopia-primary animate-pulse"></span>
              <span className="text-[10px] text-dystopia-primary uppercase tracking-wider">System Online</span>
           </div>
           <div className="h-4 w-px bg-dystopia-border"></div>
           <div className="text-[10px] text-dystopia-muted uppercase tracking-wider">User: Admin</div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: Explorer */}
        <aside className="w-80 flex flex-col border-r border-dystopia-border bg-dystopia-card/20 backdrop-blur-sm">
          <div className="p-3 border-b border-dystopia-border/50">
            <h3 className="text-[10px] font-bold text-dystopia-muted uppercase tracking-[0.2em] mb-2">Explorer</h3>
            {/* Search is handled inside UnifiedExplorer, but we might want to move it out or style it there. 
                For now, UnifiedExplorer has its own search input. We'll style it via CSS or props later. */}
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <UnifiedExplorer key={refreshKey} onRepoSelect={handleRepoSelect} onFileSelect={handleFileSelect} />
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col bg-dystopia-bg relative">
          {selectedRepo ? (
            <>
              {/* Context Header (Row 1) */}
              <div className="h-14 border-b border-dystopia-border flex items-center justify-between px-6 bg-dystopia-card/10 shrink-0">
                <div className="flex items-center gap-4 overflow-hidden">
                   <div className="flex items-center gap-2 text-lg text-dystopia-text whitespace-nowrap tracking-tight">
                      <span className="text-dystopia-primary font-bold">{selectedRepo.name}</span>
                      <span className="text-dystopia-muted/50">/</span>
                      <span className="text-dystopia-accent font-medium">{selectedPath || 'root'}</span>
                   </div>
                </div>
                
                <div className="w-64">
                   <BranchSelector repoId={selectedRepo.id} value={branch} onChange={setBranch} showLabel={false} />
                </div>
              </div>

              {/* Action Toolbar (Row 2) */}
              <div className="h-12 border-b border-dystopia-border flex items-center justify-between px-6 bg-dystopia-bg/50 shrink-0">
                {/* Primary Actions */}
                <div className="flex items-center gap-3">
                    <button
                      onClick={() => navigate(`/jobs?repoId=${selectedRepo.id}`)}
                      className="flex items-center gap-2 px-4 py-1.5 rounded-sm bg-dystopia-accent/10 border border-dystopia-accent/30 text-dystopia-accent text-xs font-bold uppercase tracking-wider hover:bg-dystopia-accent/20 transition-all shadow-[0_0_10px_rgba(0,255,255,0.05)]"
                      aria-label="Open CI Runner"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                      CI / Jobs
                    </button>

                    <button
                      disabled={!selectedPath}
                      onClick={() => {
                        if (!selectedRepo || !selectedPath) return
                        navigate(`/editor?repoId=${selectedRepo.id}&path=${encodeURIComponent(selectedPath)}&branch=${encodeURIComponent(branch)}`)
                      }}
                      className="flex items-center gap-2 px-4 py-1.5 rounded-sm bg-dystopia-primary/10 border border-dystopia-primary/30 text-dystopia-primary text-xs font-bold uppercase tracking-wider hover:bg-dystopia-primary/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(0,255,65,0.05)]"
                      aria-label="Open in editor"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                      Edit File
                    </button>
                </div>

                {/* Secondary Actions (Icon-only for cleaner look) */}
                <div className="flex items-center gap-1">
                    <button
                      disabled={!selectedRepo}
                      onClick={() => {
                        const url = buildGitHubUrl(selectedRepo, branch, selectedPath)
                        if (url) window.open(url, '_blank')
                        else alert('Unable to determine GitHub URL for this repo')
                      }}
                      className="p-2 rounded-sm text-dystopia-muted hover:text-dystopia-text hover:bg-dystopia-card/40 transition-colors disabled:opacity-30"
                      title="Open in GitHub"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                    </button>

                    <div className="w-px h-4 bg-dystopia-border mx-1"></div>

                    <button
                      disabled={!selectedPath}
                      onClick={() => {
                        try {
                          navigator.clipboard.writeText(selectedPath || '')
                          alert('Path copied')
                        } catch (e) { alert('Copy failed') }
                      }}
                      className="p-2 rounded-sm text-dystopia-muted hover:text-dystopia-text hover:bg-dystopia-card/40 transition-colors disabled:opacity-30"
                      title="Copy Path"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                    </button>

                    <button
                      disabled={!selectedRepo || !selectedPath}
                      onClick={() => {
                        try {
                          const permalink = buildPermalink(window.location.origin, String(selectedRepo.id), selectedPath || '', branch)
                          navigator.clipboard.writeText(permalink)
                          alert('Permalink copied')
                        } catch (e) { alert('Copy failed') }
                      }}
                      className="p-2 rounded-sm text-dystopia-muted hover:text-dystopia-text hover:bg-dystopia-card/40 transition-colors disabled:opacity-30"
                      title="Copy Permalink"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                    </button>
                </div>
              </div>

              {/* File Content */}
              <div className="flex-1 overflow-hidden relative">
                 {selectedPath ? (
                    <div className="h-full overflow-auto p-0">
                       <FileViewer path={selectedPath} content={fileContent} readOnly />
                    </div>
                 ) : (
                    <div className="h-full flex flex-col items-center justify-center text-dystopia-muted/30 select-none">
                       <svg className="w-24 h-24 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                       <p className="text-sm uppercase tracking-widest">Select a file to view content</p>
                    </div>
                 )}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-dystopia-muted/50">
               <div className="w-16 h-16 border border-dystopia-primary/30 rounded-full flex items-center justify-center mb-6 animate-pulse shadow-[0_0_15px_rgba(0,255,65,0.1)]">
                  <div className="w-2 h-2 bg-dystopia-primary rounded-full"></div>
               </div>
               <h2 className="text-xl font-bold text-dystopia-text tracking-widest uppercase mb-2">System Ready</h2>
               <p className="text-xs text-dystopia-muted max-w-md text-center leading-relaxed">
                 Select a repository from the explorer to begin.<br/>
                 Access restricted to authorized personnel only.
               </p>
            </div>
          )}
        </main>
      </div>

      {/* Add Repo Modal */}
      {isAddRepoOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dystopia-bg border border-dystopia-border w-full max-w-md p-6 shadow-2xl relative">
            <button 
              onClick={() => setIsAddRepoOpen(false)}
              className="absolute top-4 right-4 text-dystopia-muted hover:text-dystopia-text"
            >
              ✕
            </button>
            <h2 className="text-lg font-bold text-dystopia-text mb-4 uppercase tracking-widest">Add Repository</h2>
            <form onSubmit={handleAddRepo}>
              <div className="mb-4">
                <label className="block text-[10px] uppercase text-dystopia-muted mb-2">Git URL (HTTPS)</label>
                <input 
                  type="text" 
                  value={newRepoUrl}
                  onChange={e => setNewRepoUrl(e.target.value)}
                  placeholder="https://github.com/username/repo.git"
                  className="w-full bg-black/50 border border-dystopia-border p-2 text-sm text-dystopia-text focus:border-dystopia-primary outline-none"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsAddRepoOpen(false)}
                  className="px-4 py-2 text-xs uppercase tracking-wider text-dystopia-muted hover:text-dystopia-text"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isAddingRepo || !newRepoUrl}
                  className="px-4 py-2 bg-dystopia-primary/20 border border-dystopia-primary/50 text-dystopia-primary text-xs uppercase tracking-wider hover:bg-dystopia-primary/30 disabled:opacity-50"
                >
                  {isAddingRepo ? 'Adding...' : 'Add Repository'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
