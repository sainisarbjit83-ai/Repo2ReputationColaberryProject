import { useState, useEffect } from 'react'
import RepoCard from './RepoCard'
import { authFetch, BASE_URL } from './api'

const btn = (overrides = {}) => ({
  padding: '9px 20px',
  borderRadius: '6px',
  border: 'none',
  backgroundColor: '#4f46e5',
  color: 'white',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '14px',
  ...overrides,
})

function Header({ onLogout }) {
  const [user, setUser]                   = useState(null)
  const [githubInput, setGithubInput]     = useState('')
  const [connectLoading, setConnectLoading] = useState(false)
  const [connectError, setConnectError]   = useState(null)

  const [repos, setRepos]               = useState([])
  const [reposLoading, setReposLoading] = useState(false)
  const [reposError, setReposError]     = useState(null)
  const [reposPage, setReposPage]       = useState(1)

  const [selected, setSelected]           = useState(new Set())
  const [importLoading, setImportLoading] = useState(false)
  const [importResults, setImportResults] = useState(null)

  const [importedRepos, setImportedRepos]     = useState([])
  const [importedLoading, setImportedLoading] = useState(false)
  const [activeTab, setActiveTab]             = useState('browse')

  // Load current user on mount — check if GitHub already connected
  useEffect(() => {
    authFetch(`${BASE_URL}/api/users/me`, {}, onLogout)
      .then(res => res?.json())
      .then(data => {
        if (data) {
          setUser(data)
          if (data.github_username) loadRepos(1)
        }
      })
  }, [])

  function loadRepos(page) {
    setReposLoading(true)
    setReposError(null)
    authFetch(`${BASE_URL}/api/repos?page=${page}&limit=30`, {}, onLogout)
      .then(res => res?.json())
      .then(data => {
        if (data?.success) {
          setRepos(data.data)
          setReposPage(page)
        } else {
          setReposError(data?.error?.message || 'Failed to load repositories.')
        }
        setReposLoading(false)
      })
      .catch(() => { setReposError('Network error.'); setReposLoading(false) })
  }

  function loadImported() {
    setImportedLoading(true)
    authFetch(`${BASE_URL}/api/repos/imported?limit=50`, {}, onLogout)
      .then(res => res?.json())
      .then(data => {
        if (data?.success) setImportedRepos(data.data)
        setImportedLoading(false)
      })
      .catch(() => setImportedLoading(false))
  }

  function handleConnect() {
    if (!githubInput.trim()) return
    setConnectLoading(true)
    setConnectError(null)
    authFetch(`${BASE_URL}/api/users/me/github`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ githubUsername: githubInput.trim() }),
    }, onLogout)
      .then(res => res?.json())
      .then(data => {
        if (data?.success) {
          setUser(prev => ({ ...prev, github_username: data.data.githubUsername }))
          loadRepos(1)
        } else {
          setConnectError(data?.error?.message || 'Failed to connect GitHub.')
        }
        setConnectLoading(false)
      })
      .catch(() => { setConnectError('Network error.'); setConnectLoading(false) })
  }

  function toggleSelect(fullName) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(fullName) ? next.delete(fullName) : next.add(fullName)
      return next
    })
  }

  function handleImport() {
    if (selected.size === 0) return
    setImportLoading(true)
    setImportResults(null)
    authFetch(`${BASE_URL}/api/repos/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoFullNames: [...selected] }),
    }, onLogout)
      .then(res => res?.json())
      .then(data => {
        setImportResults(data?.data)
        setSelected(new Set())
        setImportLoading(false)
        setActiveTab('imported')
        loadImported()
      })
      .catch(() => setImportLoading(false))
  }

  // Normalise GitHub API response to match RepoCard's expected field names
  const normalise = r => ({
    id:              r.externalRepoId ?? r.id,
    name:            r.name,
    html_url:        `https://github.com/${r.fullName ?? r.full_name}`,
    description:     r.description,
    language:        r.language ?? r.primary_language,
    stargazers_count: r.starsCount ?? r.stars_count,
    updated_at:      r.repoUpdatedAt ?? r.repo_updated_at,
    fullName:        r.fullName ?? r.full_name,
  })

  const sortedRepos    = [...repos].map(normalise).sort((a, b) => b.stargazers_count - a.stargazers_count)
  const normImported   = importedRepos.map(normalise)

  return (
    <>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '22px' }}>Repo2Reputation</h1>
        <button onClick={onLogout} style={btn({ backgroundColor: '#6b7280' })}>Logout</button>
      </div>

      {/* GitHub connection panel */}
      <div style={{ marginBottom: '24px', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#f9fafb' }}>
        {user?.github_username ? (
          <p style={{ margin: 0, color: '#16a34a', fontWeight: 'bold', fontSize: '15px' }}>
            ✓ Connected: @{user.github_username}
          </p>
        ) : (
          <>
            <p style={{ margin: '0 0 10px', fontWeight: 'bold' }}>Connect your GitHub account</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                placeholder="Your GitHub username (e.g. torvalds)"
                value={githubInput}
                onChange={e => setGithubInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleConnect()}
                disabled={connectLoading}
                style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' }}
              />
              <button
                onClick={handleConnect}
                disabled={connectLoading || !githubInput.trim()}
                style={btn({ opacity: connectLoading || !githubInput.trim() ? 0.5 : 1 })}
              >
                {connectLoading ? 'Connecting…' : 'Connect'}
              </button>
            </div>
            {connectError && <p style={{ color: 'red', margin: '8px 0 0', fontSize: '14px' }}>{connectError}</p>}
          </>
        )}
      </div>

      {/* Tabs — only shown after GitHub connected */}
      {user?.github_username && (
        <>
          <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid #e5e7eb', marginBottom: '20px' }}>
            {[
              { key: 'browse',   label: 'Browse GitHub Repos' },
              { key: 'imported', label: `Imported Repos${importedRepos.length > 0 ? ` (${importedRepos.length})` : ''}` },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); if (tab.key === 'imported') loadImported() }}
                style={{
                  padding: '8px 20px',
                  border: 'none',
                  borderBottom: activeTab === tab.key ? '3px solid #4f46e5' : '3px solid transparent',
                  backgroundColor: 'transparent',
                  fontWeight: activeTab === tab.key ? 'bold' : 'normal',
                  color: activeTab === tab.key ? '#4f46e5' : '#6b7280',
                  cursor: 'pointer',
                  marginBottom: '-2px',
                  fontSize: '14px',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Browse tab */}
          {activeTab === 'browse' && (
            <>
              {reposLoading && <p style={{ color: '#6b7280' }}>Loading repositories…</p>}
              {reposError  && <p style={{ color: 'red' }}>{reposError}</p>}

              {!reposLoading && sortedRepos.length > 0 && (
                <>
                  {/* Action bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ color: '#6b7280', fontSize: '14px' }}>
                      {sortedRepos.length} repos — check boxes to select, then import
                    </span>
                    <button
                      onClick={handleImport}
                      disabled={selected.size === 0 || importLoading}
                      style={btn({ opacity: selected.size === 0 ? 0.4 : 1 })}
                    >
                      {importLoading ? 'Importing…' : `Import Selected (${selected.size})`}
                    </button>
                  </div>

                  {/* Import result banner */}
                  {importResults && (
                    <div style={{ marginBottom: '14px', padding: '10px 14px', backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', fontSize: '14px' }}>
                      ✓ Import complete — {importResults.results.filter(r => r.status === 'succeeded').length} succeeded
                      {importResults.results.filter(r => r.status === 'failed').length > 0 && (
                        <>, {importResults.results.filter(r => r.status === 'failed').length} failed</>
                      )}
                    </div>
                  )}

                  {/* Repo list with checkboxes */}
                  {sortedRepos.map((repo, index) => (
                    <div key={repo.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <input
                        type="checkbox"
                        checked={selected.has(repo.fullName)}
                        onChange={() => toggleSelect(repo.fullName)}
                        style={{ marginTop: '14px', cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1 }}>
                        <RepoCard repo={repo} isTop={index === 0} />
                      </div>
                    </div>
                  ))}

                  {/* Pagination */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    {reposPage > 1 && (
                      <button onClick={() => loadRepos(reposPage - 1)} style={btn({ backgroundColor: '#6b7280' })}>
                        ← Previous
                      </button>
                    )}
                    {sortedRepos.length === 30 && (
                      <button onClick={() => loadRepos(reposPage + 1)} style={btn()}>
                        Next →
                      </button>
                    )}
                  </div>
                </>
              )}

              {!reposLoading && sortedRepos.length === 0 && !reposError && (
                <p style={{ color: '#6b7280' }}>No public repositories found for @{user.github_username}.</p>
              )}
            </>
          )}

          {/* Imported tab */}
          {activeTab === 'imported' && (
            <>
              {importedLoading && <p style={{ color: '#6b7280' }}>Loading…</p>}
              {!importedLoading && normImported.length === 0 && (
                <p style={{ color: '#6b7280' }}>No repos imported yet. Go to Browse and select repos to import.</p>
              )}
              {!importedLoading && normImported.map(repo => (
                <RepoCard key={repo.id} repo={repo} isTop={false} />
              ))}
            </>
          )}
        </>
      )}
    </>
  )
}

export default Header
