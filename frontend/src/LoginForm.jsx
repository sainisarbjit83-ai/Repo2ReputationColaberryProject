import { useState } from 'react'

function LoginForm({ onLogin, onSwitchToRegister, sessionMessage }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login failed.')
        setLoading(false)
        return
      }

      localStorage.setItem('token', data.accessToken)
      onLogin(data.accessToken)
    } catch (err) {
      setError('Could not reach server.')
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '80px auto' }}>
      {sessionMessage && (
        <p style={{ color: '#92400e', backgroundColor: '#fef3c7', padding: '10px', borderRadius: '6px', marginBottom: '12px' }}>
          {sessionMessage}
        </p>
      )}
      <h2>Login</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: 'block', width: '100%', padding: '8px', marginBottom: '10px' }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ display: 'block', width: '100%', padding: '8px', marginBottom: '10px' }}
        onKeyDown={(e) => { if (e.key === 'Enter') handleLogin() }}
      />
      <button
        onClick={handleLogin}
        disabled={loading}
        style={{ padding: '8px 16px' }}
      >
        {loading ? 'Logging in...' : 'Login'}
      </button>
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      <p style={{ marginTop: '16px', fontSize: '14px' }}>
        Don't have an account?{' '}
        <span
          onClick={onSwitchToRegister}
          style={{ color: '#4f46e5', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Register
        </span>
      </p>
    </div>
  )
}

export default LoginForm
