import { useState, useEffect } from 'react'
import UnifiedExplorer from '../components/UnifiedExplorer'
import BranchSelector from '../components/BranchSelector'
import FileViewer from '../components/FileViewer'
import { getFileContent, createRepo, getRepos } from '../lib/api'
import { buildGitHubUrl, buildPermalink } from '../lib/utils'
import { Button, GlassCard, EmptyState } from '../components/ui'
import { useAppContext } from '../lib/AppContext'

import { useNavigate } from 'react-router-dom'

export default function RepoBrowser() {
  const { selectedRepo, selectedBranch, selectedPath, setSelectedRepo, setSelectedBranch, setSelectedPath } = useAppContext()
  const [fileContent, setFileContent] = useState<string | undefined>(undefined)
  
  // Add Repo State
  const [isAddRepoOpen, setIsAddRepoOpen] = useState(false)
  const [newRepoUrl, setNewRepoUrl] = useState('')
  const [isAddingRepo, setIsAddingRepo] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [repoCount, setRepoCount] = useState(0)

  const navigate = useNavigate()

  useEffect(() => {
    getRepos().then((data: any) => {
      const list = data.repos || data
      if (Array.isArray(list)) setRepoCount(list.length)
    }).catch(() => {})
  }, [refreshKey])

  useEffect(() => {
    if (!selectedRepo || !selectedPath) return
    setFileContent(undefined)
    getFileContent(selectedRepo.id, selectedPath, selectedBranch)
      .then((r: any) => setFileContent(r.content || r))
      .catch(() => setFileContent('// failed to load'))
  }, [selectedRepo, selectedPath, selectedBranch])

  const handleRepoSelect = (repo: any) => {
    setSelectedRepo(repo)
  }

  const handleFileSelect = (repoId: string, path: string) => {
    if (!selectedRepo || selectedRepo.id !== repoId) {
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
    <div className="h-full flex flex-col text-white font-mono overflow-hidden">
      {/* Compact Header */}
      <header className="shrink-0 border-b border-white/10 bg-black/40 backdrop-blur-xl px-4 md:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              Repositories <span className="text-white/40">({repoCount})</span>
            </h1>
          </div>
          <Button onClick={() => setIsAddRepoOpen(true)} variant="primary" size="md">
            + Add Repository
          </Button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar: Explorer */}
        <aside className="w-full md:w-72 lg:w-80 flex flex-col border-b md:border-b-0 md:border-r border-white/10 bg-black/50 backdrop-blur-xl max-h-48 md:max-h-none">
          <div className="p-3 border-b border-white/5">
            <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Explorer</h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <UnifiedExplorer key={refreshKey} onRepoSelect={handleRepoSelect} onFileSelect={handleFileSelect} />
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col bg-transparent relative overflow-hidden">
          {selectedRepo ? (
            <>
              {/* Context Header */}
              <div className="shrink-0 border-b border-white/10 bg-black/30 backdrop-blur-md px-4 md:px-6 py-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm overflow-hidden">
                    <span className="text-green-400 font-bold truncate">{selectedRepo.name}</span>
                    <span className="text-white/30">/</span>
                    <span className="text-white/60 truncate">{selectedPath || 'root'}</span>
                  </div>
                  <div className="w-full sm:w-48">
                    <BranchSelector repoId={selectedRepo.id} value={selectedBranch} onChange={setSelectedBranch} showLabel={false} />
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="shrink-0 border-b border-white/10 bg-black/20 px-4 md:px-6 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => navigate(`/jobs`)}
                    variant="secondary"
                    size="sm"
                  >
                    ⚡ CI / Jobs
                  </Button>
                  <Button
                    disabled={!selectedPath}
                    onClick={() => {
                      if (!selectedRepo || !selectedPath) return
                      navigate(`/editor`)
                    }}
                    variant="primary"
                    size="sm"
                  >
                    ✎ Edit File
                  </Button>
                  <div className="flex-1" />
                  <button
                    disabled={!selectedRepo}
                    onClick={() => {
                      const url = buildGitHubUrl(selectedRepo, selectedBranch, selectedPath || undefined)
                      if (url) window.open(url, '_blank')
                    }}
                    className="p-2 rounded text-white/40 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30"
                    title="Open in GitHub"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                  </button>
                </div>
              </div>

              {/* File Content */}
              <div className="flex-1 overflow-hidden relative">
                {selectedPath ? (
                  <div className="h-full overflow-auto">
                    <FileViewer path={selectedPath} content={fileContent} readOnly />
                  </div>
                ) : (
                  <EmptyState
                    icon={<span className="text-3xl">📄</span>}
                    title="No File Selected"
                    description="Select a file from the explorer to view its contents"
                  />
                )}
              </div>
            </>
          ) : (
            <EmptyState
              icon={<span className="text-3xl">📁</span>}
              title="No Repository Selected"
              description="Select a repository from the explorer to browse files, or add a new one to get started"
              action={
                <Button onClick={() => setIsAddRepoOpen(true)} variant="primary">
                  + Add Repository
                </Button>
              }
            />
          )}
        </main>
      </div>

      {/* Add Repo Modal */}
      {isAddRepoOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <GlassCard className="w-full max-w-md" padding="lg">
            <button 
              onClick={() => setIsAddRepoOpen(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white"
            >
              ✕
            </button>
            <h2 className="text-lg font-bold text-white mb-6 uppercase tracking-widest">Add Repository</h2>
            <form onSubmit={handleAddRepo}>
              <div className="mb-6">
                <label className="block text-[10px] uppercase text-white/40 mb-2 tracking-wider">Git URL (HTTPS)</label>
                <input 
                  type="text" 
                  value={newRepoUrl}
                  onChange={e => setNewRepoUrl(e.target.value)}
                  placeholder="https://github.com/username/repo.git"
                  className="w-full bg-black/50 border border-white/20 rounded-lg p-3 text-sm text-white focus:border-green-500/50 outline-none transition-colors"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsAddRepoOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isAddingRepo || !newRepoUrl} loading={isAddingRepo}>
                  Add Repository
                </Button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  )
}
