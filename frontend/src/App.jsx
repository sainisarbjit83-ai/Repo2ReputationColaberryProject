import { useState } from 'react'
import Header from './Header'
import LoginForm from './LoginForm'
import AuthCallback from './AuthCallback'
import PublicPortfolio from './PublicPortfolio'
import RecruiterSearch from './RecruiterSearch'

function App() {
  const path = window.location.pathname

  // Recruiter search — public, no auth
  if (path === '/search' || path === '/search/') {
    return <RecruiterSearch />
  }

  // Public portfolio route — bypass auth entirely
  const portfolioMatch =
    path.match(/^\/portfolio\/([^/]+)\/?$/) ||
    path.match(/^\/portfolios\/public\/([^/]+)\/?$/)
  if (portfolioMatch) {
    const slug = portfolioMatch[1]
    if (slug) return <PublicPortfolio slug={slug} />
  }

  const storedToken = localStorage.getItem('token')
  const isValidTokenShape = storedToken && storedToken.split('.').length === 3
  if (!isValidTokenShape && storedToken) localStorage.removeItem('token')
  const [token, setToken] = useState(isValidTokenShape ? storedToken : null)
  const [sessionMessage, setSessionMessage] = useState(null)

  const handleLogin = (newToken) => {
    setSessionMessage(null)
    setToken(newToken)
  }

  const handleLogout = (message = null) => {
    localStorage.removeItem('token')
    setToken(null)
    setSessionMessage(message)
  }

  // OAuth callback page — must be checked before token gate
  if (path === '/auth/callback') {
    return <AuthCallback onLogin={handleLogin} />
  }

  if (!token) {
    return (
      <LoginForm
        sessionMessage={sessionMessage}
      />
    )
  }

  return <Header onLogout={handleLogout} />
}

export default App
