import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import RepoBrowser from './pages/RepoBrowser'
import Login from './pages/Login'
import Editor from './pages/Editor'
import JobRunner from './pages/JobRunner'
import Sandboxes from './pages/Sandboxes'
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
        <div className="fixed inset-0 z-0">
          <ColorBends
            colors={["#ff5c7a", "#8a5cff", "#00ffd1"]}
            rotation={30}
            speed={0.3}
            scale={1.2}
            frequency={1.4}
            warpStrength={1.2}
            mouseInfluence={0.8}
            parallax={0.6}
            noise={0.08}
            transparent
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
      <div className="fixed inset-0 z-0 pointer-events-none">
        <ColorBends
          colors={["#ff5c7a", "#8a5cff", "#00ffd1"]}
          rotation={30}
          speed={0.3}
          scale={1.2}
          frequency={1.4}
          warpStrength={1.2}
          mouseInfluence={0.8}
          parallax={0.6}
          noise={0.08}
          transparent
        />
      </div>
      <div className="relative z-10 h-screen">
        <Routes>
          <Route path="/" element={<RepoBrowser />} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/jobs" element={<JobRunner />} />
          <Route path="/sandboxes" element={<Sandboxes />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
