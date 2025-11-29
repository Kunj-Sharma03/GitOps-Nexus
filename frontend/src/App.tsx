import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import RepoBrowser from './pages/RepoBrowser'
import Login from './pages/Login'
import Editor from './pages/Editor'
import JobRunner from './pages/JobRunner'
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
    return <Login />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RepoBrowser />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/jobs" element={<JobRunner />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
