import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'

interface Repo {
  id: string
  name: string
  url: string
  defaultBranch?: string
  [key: string]: any
}

interface AppState {
  selectedRepo: Repo | null
  selectedBranch: string
  selectedPath: string | null
}

interface AppContextValue extends AppState {
  setSelectedRepo: (repo: Repo | null) => void
  setSelectedBranch: (branch: string) => void
  setSelectedPath: (path: string | null) => void
  clearSelection: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

const STORAGE_KEY = 'gitops-app-state'

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    // Load from sessionStorage on mount
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (e) {
      console.error('Failed to load app state', e)
    }
    return {
      selectedRepo: null,
      selectedBranch: 'main',
      selectedPath: null,
    }
  })

  // Persist to sessionStorage on change
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (e) {
      console.error('Failed to save app state', e)
    }
  }, [state])

  const setSelectedRepo = (repo: Repo | null) => {
    setState(s => ({
      ...s,
      selectedRepo: repo,
      selectedBranch: repo?.defaultBranch || 'main',
      selectedPath: null, // Reset path when repo changes
    }))
  }

  const setSelectedBranch = (branch: string) => {
    setState(s => ({ ...s, selectedBranch: branch }))
  }

  const setSelectedPath = (path: string | null) => {
    setState(s => ({ ...s, selectedPath: path }))
  }

  const clearSelection = () => {
    setState({
      selectedRepo: null,
      selectedBranch: 'main',
      selectedPath: null,
    })
  }

  return (
    <AppContext.Provider
      value={{
        ...state,
        setSelectedRepo,
        setSelectedBranch,
        setSelectedPath,
        clearSelection,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return ctx
}
