import { useState, useEffect } from 'react'
import { getRepos, getFiles } from '../lib/api'

interface ExplorerItem {
  type: 'repo' | 'folder' | 'file'
  name: string
  path?: string
  repoId?: string
  repo?: any
  children?: ExplorerItem[]
  expanded?: boolean
}

export default function UnifiedExplorer({ onRepoSelect, onFileSelect }: {
  onRepoSelect: (repo: any) => void
  onFileSelect: (repoId: string, path: string) => void
}) {
  const [items, setItems] = useState<ExplorerItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    getRepos()
      .then((data: any) => {
        console.log('Raw repos response:', data)
        // Backend returns { repos: [] }
        const repos = data.repos || []
        console.log('Processed repos:', repos)
        
        if (!Array.isArray(repos)) {
          console.error('Expected repos array, got:', typeof repos, repos)
          setItems([])
          return
        }
        
        const repoItems: ExplorerItem[] = repos.map(repo => ({
          type: 'repo',
          name: repo.name,
          repoId: repo.id,
          repo,
          children: [],
          expanded: false
        }))
        setItems(repoItems)
      })
      .catch((err) => {
        console.error('Failed to load repos:', err)
        setItems([])
      })
      .finally(() => setLoading(false))
  }, [])

  const toggleRepo = async (repoIndex: number) => {
    const newItems = [...items]
    const repo = newItems[repoIndex]
    
    if (!repo.expanded) {
      // Expand - load files
      try {
        const files = await getFiles(repo.repoId!, repo.repo?.defaultBranch || 'main')
        const fileTree = buildFileTree(files.files || files)
        repo.children = fileTree
        repo.expanded = true
      } catch (err) {
        console.error('Failed to load files:', err)
        repo.children = []
        repo.expanded = true
      }
    } else {
      // Collapse
      repo.expanded = false
      repo.children = []
    }
    
    setItems(newItems)
    onRepoSelect(repo.repo)
  }

  const toggleFolder = (repoIndex: number, folderPath: string[]) => {
    const newItems = [...items]
    let current = newItems[repoIndex]
    
    // Navigate to the folder
    for (let i = 0; i < folderPath.length - 1; i++) {
      const folder = current.children?.find(child => child.name === folderPath[i] && child.type === 'folder')
      if (folder) current = folder
    }
    
    const targetFolder = current.children?.find(child => child.name === folderPath[folderPath.length - 1] && child.type === 'folder')
    if (targetFolder) {
      targetFolder.expanded = !targetFolder.expanded
    }
    
    setItems(newItems)
  }

  const buildFileTree = (files: any[]): ExplorerItem[] => {
    const tree: ExplorerItem[] = []
    const pathMap = new Map<string, ExplorerItem>()

    // Sort files by path for consistent ordering
    files.sort((a, b) => a.path.localeCompare(b.path))

    files.forEach(file => {
      const parts = file.path.split('/')
      let currentPath = ''
      let currentLevel = tree

      parts.forEach((part: string, index: number) => {
        const isLast = index === parts.length - 1
        currentPath = currentPath ? `${currentPath}/${part}` : part

        let existingItem = currentLevel.find(item => item.name === part)
        
        if (!existingItem) {
          const newItem: ExplorerItem = {
            type: isLast ? 'file' : 'folder',
            name: part,
            path: isLast ? file.path : currentPath,
            children: isLast ? undefined : [],
            expanded: false
          }
          currentLevel.push(newItem)
          pathMap.set(currentPath, newItem)
          existingItem = newItem
        }

        if (!isLast && existingItem.children) {
          currentLevel = existingItem.children
        }
      })
    })

    return tree
  }

  const renderTree = (items: ExplorerItem[], level: number = 0, repoIndex?: number, folderPath: string[] = [], currentRepo?: ExplorerItem) => {
    return items.map((item, index) => (
      <div key={`${item.name}-${level}-${index}`}>
        <div
          className={`flex items-center gap-2 px-2 py-1 text-sm cursor-pointer hover:bg-dystopia-primary/10 rounded ${
            level === 0 ? 'font-semibold' : ''
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => {
            if (item.type === 'repo') {
              toggleRepo(index)
            } else if (item.type === 'folder') {
              toggleFolder(repoIndex!, [...folderPath, item.name])
            } else if (item.type === 'file' && item.path) {
              // For files, use the current repo context or find it in the top-level items
              const repo = currentRepo || items[repoIndex || 0]
              if (repo && repo.repoId) {
                console.log('File selected:', item.path, 'in repo:', repo.repoId)
                // Ensure the repo is selected first, then the file
                onRepoSelect(repo.repo)
                onFileSelect(repo.repoId, item.path)
              }
            }
          }}
        >
          {/* Icon */}
          <span className="text-dystopia-accent w-4 text-center">
            {item.type === 'repo' ? (
              item.expanded ? '📂' : '📁'
            ) : item.type === 'folder' ? (
              item.expanded ? '📂' : '📁'
            ) : (
              '📄'
            )}
          </span>
          
          {/* Expand/collapse arrow for folders and repos */}
          {(item.type === 'repo' || item.type === 'folder') && (
            <span className="text-dystopia-muted text-xs w-3">
              {item.expanded ? '▼' : '▶'}
            </span>
          )}
          
          {/* Name */}
          <span className={`flex-1 ${
            item.type === 'repo' ? 'text-dystopia-primary' :
            item.type === 'folder' ? 'text-dystopia-accent' :
            'text-dystopia-text'
          }`}>
            {item.name}
          </span>
          
          {/* Repo metadata */}
          {item.type === 'repo' && (
            <span className="text-xs text-dystopia-muted">
              {item.repo?.defaultBranch || 'main'}
            </span>
          )}
        </div>
        
        {/* Render children if expanded */}
        {item.expanded && item.children && item.children.length > 0 && (
          <div>
            {renderTree(
              item.children, 
              level + 1, 
              item.type === 'repo' ? index : repoIndex, 
              item.type === 'folder' ? [...folderPath, item.name] : folderPath,
              item.type === 'repo' ? item : currentRepo
            )}
          </div>
        )}
      </div>
    ))
  }

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="text-dystopia-primary text-sm animate-pulse">Loading repositories...</div>
      </div>
    )
  }

    return (
      <div className="h-full overflow-y-auto">
      {items.length === 0 ? (
        <div className="p-4 text-center text-dystopia-muted text-sm">
          <div>No repositories found</div>
          <div className="text-xs mt-2">
            JWT: {localStorage.getItem('jwt') ? '✓ Present' : '✗ Missing'}
          </div>
          <div className="text-xs">
            Check browser console for errors
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {renderTree(items)}
        </div>
      )}
    </div>
  )
}