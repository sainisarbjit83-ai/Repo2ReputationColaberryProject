import { useState } from 'react'

function RegisterForm({ onRegister, onSwitchToLogin }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(false)

  async function handleRegister() {
    setLoading(true)
    setError(null)

    try {
      const res  = await fetch('http://localhost:5000/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error?.message || data.error || 'Registration failed.')
        setLoading(false)
        return
      }

      const loginRes  = await fetch('http://localhost:5000/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      })
      const loginData = await loginRes.json()

      if (!loginRes.ok) {
        setError('Registered but could not log in automatically.')
        onSwitchToLogin()
        return
      }

      localStorage.setItem('token', loginData.accessToken)
      onRegister(loginData.accessToken)
    } catch {
      setError('Could not reach server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* LEFT PANEL */}
      <div className="hidden lg:flex w-1/2 bg-indigo-600 flex-col justify-between p-12">

        {/* Top: logo + brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center">
            <span className="text-indigo-600 font-bold text-lg">R</span>
          </div>
          <span className="text-white font-bold text-lg">Repo2Reputation</span>
        </div>

        {/* Middle: tagline + features */}
        <div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Turn your GitHub work into a reputation that speaks for you.
          </h2>
          <p className="text-indigo-200 text-base leading-relaxed mb-8">
            We analyze your repositories and highlight your skills, impact, and expertise.
          </p>
          <div className="space-y-4">
            {[
              'AI-powered repository analysis',
              'Automatic skill & tech extraction',
              'Portfolio-ready reports',
            ].map(feature => (
              <div key={feature} className="flex items-center gap-3 text-indigo-100">
                <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: copyright */}
        <p className="text-indigo-400 text-xs">© 2026 Repo2Reputation</p>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-8">
        <div className="max-w-sm w-full">

          {/* Logo + brand (mobile only) */}
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">R</span>
            </div>
            <span className="text-indigo-600 font-bold text-lg">Repo2Reputation</span>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">Create an account</h2>
          <p className="text-gray-500 text-sm mb-8">Start building your developer reputation today.</p>

          {/* Inputs */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="off"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleRegister() }}
            autoComplete="new-password"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-6 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {/* Error banner */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl text-sm transition disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Register'}
          </button>

          {/* Switch to login */}
          <p className="mt-6 text-sm text-gray-500 text-center">
            Already have an account?{' '}
            <span
              onClick={onSwitchToLogin}
              className="text-indigo-600 cursor-pointer hover:underline font-medium"
            >
              Log in
            </span>
          </p>

        </div>
      </div>

    </div>
  )
}

export default RegisterForm
