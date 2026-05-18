import { useState } from 'react'
import Header from './Header'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'
import PublicPortfolio from './PublicPortfolio'
import RecruiterSearch from './RecruiterSearch'

function App() {
  const path = window.location.pathname

  // Recruiter search — public, no auth
  if (path === '/search' || path === '/search/') {
    return <RecruiterSearch />
  }

  // Public portfolio route — bypass auth entirely
  // Matches /portfolio/:slug  OR  /portfolios/public/:slug
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
  const [view, setView] = useState('login')
  const [sessionMessage, setSessionMessage] = useState(null)

  const handleLogin = (newToken) => {
    setSessionMessage(null)
    setToken(newToken)
  }

  const handleLogout = (message = null) => {
    localStorage.removeItem('token')
    setToken(null)
    setView('login')
    setSessionMessage(message)
  }

  if (!token) {
    if (view === 'register') {
      return (
        <RegisterForm
          onRegister={handleLogin}
          onSwitchToLogin={() => setView('login')}
        />
      )
    }
    return (
      <LoginForm
        onLogin={handleLogin}
        onSwitchToRegister={() => setView('register')}
        sessionMessage={sessionMessage}
      />
    )
  }

  return <Header onLogout={handleLogout} />
}

export default App
