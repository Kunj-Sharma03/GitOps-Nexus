import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import RepoBrowser from './pages/RepoBrowser'
import Login from './pages/Login'
import Editor from './pages/Editor'
import JobRunner from './pages/JobRunner'
import Sandboxes from './pages/Sandboxes'
import { Layout } from './components/Layout'
import { AppProvider } from './lib/AppContext'
import ColorBends from './Background/ColorBends'
import './App.css'

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('jwt'))

  useEffect(() => {
    // Check for token in URL (from OAuth redirect)
    const params = new URLSearchParams(window.location.search)
    const urlToken = params.get('token')
    
    if (urlToken) {
      localStorage.setItem('jwt', urlToken)
      setToken(urlToken)
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  if (!token) {
    return (
      <>
        <div className="fixed inset-0 z-0 opacity-40">
          <ColorBends
            colors={["#ff5c7a", "#8a5cff", "#00ffd1"]}
            rotation={0}
            autoRotate={-3}
            speed={0.2}
            scale={1}
            frequency={1}
            warpStrength={1}
            mouseInfluence={1}
            parallax={0.5}
            noise={0.01}
          />
        </div>
        <div className="relative z-10">
          <Login />
        </div>
      </>
    )
  }

  return (
    <BrowserRouter>
      <AppProvider>
        <div className="fixed inset-0 z-0 opacity-40">
          <ColorBends
            colors={["#ff5c7a", "#8a5cff", "#00ffd1"]}
            rotation={0}
            autoRotate={-3}
            speed={0.2}
            scale={1}
            frequency={1}
            warpStrength={1}
            mouseInfluence={1}
            parallax={0.5}
            noise={0.01}
          />
        </div>
        <div className="relative z-10 h-screen">
          <Layout>
            <Routes>
              <Route path="/" element={<RepoBrowser />} />
              <Route path="/editor" element={<Editor />} />
              <Route path="/jobs" element={<JobRunner />} />
              <Route path="/sandboxes" element={<Sandboxes />} />
            </Routes>
          </Layout>
        </div>
      </AppProvider>
    </BrowserRouter>
  )
}

export default App
