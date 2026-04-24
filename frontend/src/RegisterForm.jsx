import { useState } from 'react'

function RegisterForm({ onRegister, onSwitchToLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Registration failed.')
        setLoading(false)
        return
      }

      // Auto-login after successful registration
      const loginRes = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const loginData = await loginRes.json()

      if (!loginRes.ok) {
        setError('Registered but could not log in. Please log in manually.')
        setLoading(false)
        onSwitchToLogin()
        return
      }

      localStorage.setItem('token', loginData.token)
      onRegister(loginData.token)
    } catch (err) {
      setError('Could not reach server.')
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '80px auto' }}>
      <h2>Register</h2>
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
        onKeyDown={(e) => { if (e.key === 'Enter') handleRegister() }}
      />
      <button
        onClick={handleRegister}
        disabled={loading}
        style={{ padding: '8px 16px' }}
      >
        {loading ? 'Registering...' : 'Register'}
      </button>
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      <p style={{ marginTop: '16px', fontSize: '14px' }}>
        Already have an account?{' '}
        <span
          onClick={onSwitchToLogin}
          style={{ color: '#4f46e5', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Log in
        </span>
      </p>
    </div>
  )
}

export default RegisterForm
