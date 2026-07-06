import { BASE_URL } from './api'

const FEATURES = [
  {
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
    text: 'AI analyzes your GitHub repos automatically',
  },
  {
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    text: 'LinkedIn PDF fills your profile in seconds',
  },
  {
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>
    ),
    text: 'Shareable portfolio URL + downloadable PDF resume',
  },
]

// Mini portfolio card shown on the left panel
function PortfolioPreview() {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.1)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255,255,255,0.2)',
      borderRadius: '16px',
      padding: '16px',
      marginTop: '40px',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          background: 'linear-gradient(135deg,#a78bfa,#818cf8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: '800', fontSize: '14px', color: '#fff', flexShrink: 0,
        }}>AK</div>
        <div>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#fff', lineHeight: 1.2 }}>Alex Kumar</p>
          <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.3 }}>
            AI Engineer · Full Stack Developer
          </p>
        </div>
        <div style={{
          marginLeft: 'auto', padding: '3px 8px', borderRadius: '20px',
          background: 'rgba(74,222,128,0.2)', border: '1px solid rgba(74,222,128,0.4)',
          fontSize: '10px', fontWeight: '600', color: '#4ade80', whiteSpace: 'nowrap',
        }}>
          ● Open to work
        </div>
      </div>

      {/* Skill chips */}
      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {['React', 'Node.js', 'Python', 'OpenAI', 'PostgreSQL'].map(s => (
          <span key={s} style={{
            padding: '3px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '600',
            background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>{s}</span>
        ))}
      </div>

      {/* Project card */}
      <div style={{
        background: 'rgba(255,255,255,0.08)',
        borderRadius: '10px', padding: '10px 12px',
        border: '1px solid rgba(255,255,255,0.12)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: '#fff' }}>AI Workforce OS</p>
          <span style={{
            fontSize: '10px', fontWeight: '600', padding: '2px 7px',
            borderRadius: '20px', background: 'rgba(129,140,248,0.3)', color: '#c7d2fe',
          }}>TypeScript</span>
        </div>
        <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
          An AI-powered platform automating enterprise workflows with GPT-4 integration and real-time orchestration.
        </p>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>repo2reputation.com/alex-kumar</span>
        <div style={{
          padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '600',
          background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer',
        }}>Download PDF ↓</div>
      </div>
    </div>
  )
}

function LoginForm({ sessionMessage }) {
  function handleGitHubLogin() {
    window.location.href = `${BASE_URL}/api/auth/github`
  }

  return (
    <div className="min-h-screen flex">

      {/* LEFT PANEL */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12" style={{
        background: 'linear-gradient(145deg, #4338ca 0%, #5b21b6 60%, #6d28d9 100%)',
      }}>
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm">
            <span className="font-bold text-lg" style={{ color: '#4338ca' }}>R</span>
          </div>
          <span className="text-white font-bold text-lg">Repo2Reputation</span>
        </div>

        {/* Headline + features */}
        <div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Turn your GitHub work into a reputation that speaks for you.
          </h2>
          <p className="text-indigo-200 text-sm leading-relaxed mb-8">
            We analyze your repositories and highlight your skills, impact, and expertise.
          </p>

          <div className="space-y-4 mb-2">
            {FEATURES.map(f => (
              <div key={f.text} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#c4b5fd' }}>
                  {f.icon}
                </div>
                <span className="text-indigo-100 text-sm leading-relaxed">{f.text}</span>
              </div>
            ))}
          </div>

          <PortfolioPreview />
        </div>

        <p className="text-indigo-400 text-xs">© 2026 Repo2Reputation</p>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8"
        style={{ background: '#f8fafc' }}>
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: '#4338ca' }}>
              <span className="text-white font-bold">R</span>
            </div>
            <span className="font-bold text-lg" style={{ color: '#4338ca' }}>Repo2Reputation</span>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

            {/* Session expired banner */}
            {sessionMessage && (
              <div className="mb-5 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm font-medium">
                {sessionMessage}
              </div>
            )}

            <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome</h2>
            <p className="text-gray-400 text-sm mb-7">
              Sign in to start building your developer portfolio.
            </p>

            {/* GitHub OAuth button */}
            <button
              onClick={handleGitHubLogin}
              className="w-full flex items-center justify-center gap-3 text-white font-semibold py-3.5 rounded-xl text-sm transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', boxShadow: '0 4px 14px rgba(15,23,42,0.3)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              Continue with GitHub
            </button>

            <p className="mt-5 text-xs text-gray-400 text-center leading-relaxed">
              By continuing, you agree to allow Repo2Reputation to access your GitHub profile and repositories.
            </p>

            <div className="mt-5 pt-5 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400 mb-2">Need to use a different GitHub account?</p>
              <a
                href="https://github.com/logout"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium hover:underline"
                style={{ color: '#4338ca' }}
              >
                Sign out of GitHub first →
              </a>
            </div>
          </div>

          {/* Trust note */}
          <p className="text-center text-xs text-gray-400 mt-5">
            Your code never leaves GitHub. We only read metadata and README files.
          </p>

        </div>
      </div>

    </div>
  )
}

export default LoginForm
