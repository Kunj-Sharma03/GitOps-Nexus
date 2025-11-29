import { useState, useEffect } from 'react'
import UnifiedExplorer from '../components/UnifiedExplorer'
import BranchSelector from '../components/BranchSelector'
import FileViewer from '../components/FileViewer'
import { getFileContent } from '../lib/api'
import { buildGitHubUrl, buildPermalink } from '../lib/utils'

import { useNavigate } from 'react-router-dom'

export default function RepoBrowser() {
  const [selectedRepo, setSelectedRepo] = useState<any | null>(null)
  const [branch, setBranch] = useState<string>('main')
  const [selectedPath, setSelectedPath] = useState<string | undefined>(undefined)
  const [fileContent, setFileContent] = useState<string | undefined>(undefined)
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
            <UnifiedExplorer onRepoSelect={handleRepoSelect} onFileSelect={handleFileSelect} />
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col bg-dystopia-bg relative">
          {selectedRepo ? (
            <>
              {/* Content Header */}
              <div className="h-12 border-b border-dystopia-border flex items-center justify-between px-4 bg-dystopia-card/10">
                <div className="flex items-center gap-4 overflow-hidden">
                   <div className="flex items-center gap-2 text-sm text-dystopia-text whitespace-nowrap">
                      <span className="text-dystopia-primary font-bold">{selectedRepo.name}</span>
                      <span className="text-dystopia-muted">/</span>
                      <span className="text-dystopia-accent">{selectedPath || 'root'}</span>
                   </div>
                </div>
                
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-48">
                     <BranchSelector repoId={selectedRepo.id} value={branch} onChange={setBranch} showLabel={false} />
                  </div>
                  <div className="h-4 w-px bg-dystopia-border"></div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/jobs?repoId=${selectedRepo.id}`)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-dystopia-accent/10 border border-dystopia-accent/30 text-dystopia-accent text-xs uppercase tracking-wider hover:bg-dystopia-accent/20 transition-all"
                      aria-label="Open CI Runner"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                      CI/Jobs
                    </button>

                    <button
                      disabled={!selectedPath}
                      onClick={() => {
                        if (!selectedRepo || !selectedPath) return
                        navigate(`/editor?repoId=${selectedRepo.id}&path=${encodeURIComponent(selectedPath)}&branch=${encodeURIComponent(branch)}`)
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-dystopia-primary/10 border border-dystopia-primary/30 text-dystopia-primary text-xs uppercase tracking-wider hover:bg-dystopia-primary/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Open in editor"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                      Edit File
                    </button>

                    <button
                      disabled={!selectedRepo}
                      onClick={() => {
                        const url = buildGitHubUrl(selectedRepo, branch, selectedPath)
                        if (url) window.open(url, '_blank')
                        else alert('Unable to determine GitHub URL for this repo')
                      }}
                      className="text-xs px-2 py-1 rounded-sm bg-dystopia-card/20 border border-dystopia-border/40 text-dystopia-text hover:bg-dystopia-card/40 disabled:opacity-40"
                      aria-label="Open on GitHub"
                    >Open in GitHub</button>

                    <button
                      disabled={!selectedPath}
                      onClick={() => {
                        try {
                          navigator.clipboard.writeText(selectedPath || '')
                          alert('Path copied')
                        } catch (e) { alert('Copy failed') }
                      }}
                      className="text-xs px-2 py-1 rounded-sm border border-dystopia-border/40 text-dystopia-muted hover:text-dystopia-text disabled:opacity-40"
                      aria-label="Copy path"
                    >Copy Path</button>

                    <button
                      disabled={!selectedRepo || !selectedPath}
                      onClick={() => {
                        try {
                          const permalink = buildPermalink(window.location.origin, String(selectedRepo.id), selectedPath || '', branch)
                          navigator.clipboard.writeText(permalink)
                          alert('Permalink copied')
                        } catch (e) { alert('Copy failed') }
                      }}
                      className="text-xs px-2 py-1 rounded-sm border border-dystopia-border/40 text-dystopia-muted hover:text-dystopia-text disabled:opacity-40"
                      aria-label="Copy permalink"
                    >Permalink</button>
                  </div>
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
    </div>
  )
}
