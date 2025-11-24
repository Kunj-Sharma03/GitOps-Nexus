import { useState, useEffect } from 'react'
import UnifiedExplorer from '../components/UnifiedExplorer'
import BranchSelector from '../components/BranchSelector'
import FileViewer from '../components/FileViewer'
import DiffViewer from '../components/DiffViewer'
import CommitPanel from '../components/CommitPanel'
import { getFileContent } from '../lib/api'

export default function RepoBrowser() {
  const [selectedRepo, setSelectedRepo] = useState<any | null>(null)
  const [branch, setBranch] = useState<string>('main')
  const [selectedPath, setSelectedPath] = useState<string | undefined>(undefined)
  const [fileContent, setFileContent] = useState<string | undefined>(undefined)

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
    <div className="min-h-screen p-8 bg-gradient-to-br from-dystopia-bg to-[#0c0c10] text-dystopia-text font-mono">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-dystopia-primary to-dystopia-accent tracking-tight">
            GitOps_Nexus
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="h-2 w-2 rounded-full bg-dystopia-primary animate-pulse"></span>
            <p className="text-xs text-dystopia-muted font-medium">SYSTEM ONLINE</p>
          </div>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
           <div className="text-xs text-dystopia-muted px-3 py-1 rounded-full bg-dystopia-card border border-dystopia-border">USER: ADMIN</div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-10rem)]">
        <div className="col-span-4 bg-dystopia-card/40 backdrop-blur-md border border-dystopia-border/50 rounded-2xl flex flex-col overflow-hidden shadow-xl shadow-black/20">
          <div className="p-4 border-b border-dystopia-border/50 bg-dystopia-card/50">
            <h3 className="text-xs font-semibold text-dystopia-muted uppercase tracking-wider">Explorer</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            <UnifiedExplorer onRepoSelect={handleRepoSelect} onFileSelect={handleFileSelect} />
          </div>
        </div>

        <div className="col-span-8 flex flex-col gap-6">
          <div className="flex items-center justify-between bg-dystopia-card/40 backdrop-blur-md border border-dystopia-border/50 rounded-2xl p-4 shadow-lg">
            <h2 className="text-lg font-medium text-dystopia-text flex items-center gap-2">
              <span className="text-dystopia-muted">Target:</span>
              {selectedRepo ? <span className="text-dystopia-primary">{selectedRepo.name}</span> : <span className="text-dystopia-muted italic">None Selected</span>}
            </h2>
            <div className="w-64">
              <BranchSelector repoId={selectedRepo ? selectedRepo.id : null} value={branch} onChange={setBranch} />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <CommitPanel
                repoId={selectedRepo ? selectedRepo.id : null}
                branch={branch}
                selectedPath={selectedPath}
                selectedRepo={selectedRepo}
                onSuccess={(r: any) => {
                  console.log('commit result', r)
                  // if backend returned refreshed content, update the viewer
                  if (r && r.refreshed && r.refreshed.content) {
                    setFileContent(r.refreshed.content)
                  }
                }}
              />
            </div>
            <div className="col-span-1">
              <DiffViewer repoId={selectedRepo ? selectedRepo.id : null} base={(selectedRepo && selectedRepo.defaultBranch) || 'main'} head={branch} />
            </div>
          </div>

          <div className="flex-1 bg-dystopia-bg/50 backdrop-blur-md border border-dystopia-border/50 rounded-2xl flex flex-col overflow-hidden shadow-xl">
             <div className="p-3 border-b border-dystopia-border/50 bg-dystopia-card/50 flex justify-between items-center">
                <h3 className="text-xs font-semibold text-dystopia-muted uppercase tracking-wider">Content</h3>
                <span className="text-xs text-dystopia-muted font-mono">{selectedPath || 'No file selected'}</span>
             </div>
             <div className="flex-1 overflow-hidden relative">
                <FileViewer path={selectedPath} content={fileContent} />
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
