import { useEffect, useState } from 'react'
import RepoBrowser from './pages/RepoBrowser'
import Login from './pages/Login'
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
    <RepoBrowser />
  )
}

export default App
