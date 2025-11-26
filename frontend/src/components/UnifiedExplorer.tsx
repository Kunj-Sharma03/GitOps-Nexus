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
  const [query, setQuery] = useState<string>('')

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
      <div key={`${item.name}-${level}-${index}`} role="treeitem" aria-expanded={item.type === 'file' ? undefined : !!item.expanded} tabIndex={0} onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          const target = e.currentTarget as HTMLElement
          target.click()
        }
      }}>
        <div
          className={`
            group flex items-center gap-2 px-2 py-1 text-xs cursor-pointer rounded-sm transition-colors select-none
            ${level === 0 ? 'mb-1 mt-2 font-bold text-dystopia-text/90 hover:bg-dystopia-card/50' : 'hover:bg-dystopia-primary/10 text-dystopia-muted hover:text-dystopia-text'}
          `}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => {
            if (item.type === 'repo') {
              toggleRepo(index)
            } else if (item.type === 'folder') {
              toggleFolder(repoIndex!, [...folderPath, item.name])
            } else if (item.type === 'file' && item.path) {
              const repo = currentRepo || items[repoIndex || 0]
              if (repo && repo.repoId) {
                onRepoSelect(repo.repo)
                onFileSelect(repo.repoId, item.path)
              }
            }
          }}
        >
          {/* Icon */}
          <span className={`w-4 flex justify-center shrink-0 ${item.type === 'repo' ? 'text-dystopia-primary' : item.type === 'folder' ? 'text-dystopia-accent/70' : 'text-dystopia-muted/70'}`}>
            {item.type === 'repo' ? (
               <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"></path></svg>
            ) : item.type === 'folder' ? (
               <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path></svg>
            ) : (
               <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            )}
          </span>
          
          {/* Name */}
          <span className="flex-1 truncate">
            {item.name}
          </span>

          {/* Chevron for expandable items */}
          {(item.type === 'repo' || item.type === 'folder') && (
            <span className={`text-[10px] text-dystopia-muted transition-transform duration-200 ${item.expanded ? 'rotate-90' : ''}`}>
              ▶
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

  // Client-side filtering for explorer
  const filterNode = (node: ExplorerItem, q: string): ExplorerItem | null => {
    const match = node.name.toLowerCase().includes(q)
    if (node.type === 'file') {
      return match ? node : null
    }
    const children = node.children ? node.children.map(c => filterNode(c, q)).filter(Boolean) as ExplorerItem[] : []
    if (match || (children && children.length > 0)) {
      return { ...node, children, expanded: !!children.length }
    }
    return null
  }

  const displayed = (() => {
    if (!query.trim()) return items
    const q = query.toLowerCase()
    return items.map(repo => filterNode(repo, q)).filter(Boolean) as ExplorerItem[]
  })()

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b border-dystopia-border/30">
        <div className="relative">
          <input 
            placeholder="Search..." 
            aria-label="Search repositories and files"
            value={query} 
            onChange={e => setQuery(e.target.value)} 
            className="w-full bg-black/20 border border-dystopia-border/50 rounded-sm py-1.5 pl-8 pr-2 text-xs text-dystopia-text focus:border-dystopia-primary focus:outline-none placeholder-dystopia-muted/50 transition-colors" 
          />
          <svg className="absolute left-2.5 top-2 w-3 h-3 text-dystopia-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        {loading ? (
          <div className="p-4 flex flex-col items-center gap-2 text-dystopia-muted/50">
             <div className="w-4 h-4 border-2 border-dystopia-primary/30 border-t-dystopia-primary rounded-full animate-spin"></div>
             <span className="text-[10px] uppercase tracking-wider">Scanning...</span>
          </div>
        ) : displayed.length === 0 ? (
          <div className="p-8 text-center text-dystopia-muted/40">
            <div className="text-2xl mb-2 opacity-20">∅</div>
            <div className="text-[10px] uppercase tracking-widest">No Data Found</div>
          </div>
        ) : (
          <div className="space-y-0.5">
            {renderTree(displayed)}
          </div>
        )}
      </div>
    </div>
  )
}