import { useEffect, useState } from 'react'
import AnalysisPanel from './AnalysisPanel'
import PortfolioBuilder from './PortfolioBuilder'
import { authFetch, BASE_URL } from './api'

// ── Helpers ───────────────────────────────────────────────────────────────────

const LANG_COLORS = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python:     '#3572A5',
  Ruby:       '#701516',
  Go:         '#00ADD8',
  Java:       '#b07219',
  Rust:       '#dea584',
  'C++':      '#f34b7d',
  Shell:      '#89e051',
  HTML:       '#e34c26',
  CSS:        '#563d7c',
  Dart:       '#00B4AB',
  Kotlin:     '#A97BFF',
  Swift:      '#ffac45',
}

function langColor(lang) {
  return LANG_COLORS[lang] || '#8b949e'
}

const DEVICON_BASE = 'https://cdn.jsdelivr.net/gh/devicons/devicon@v2.15.1/icons'
const LANG_ICONS = {
  TypeScript: `${DEVICON_BASE}/typescript/typescript-original.svg`,
  JavaScript: `${DEVICON_BASE}/javascript/javascript-original.svg`,
  Python:     `${DEVICON_BASE}/python/python-original.svg`,
  Ruby:       `${DEVICON_BASE}/ruby/ruby-original.svg`,
  Go:         `${DEVICON_BASE}/go/go-original.svg`,
  Java:       `${DEVICON_BASE}/java/java-original.svg`,
  Rust:       `${DEVICON_BASE}/rust/rust-plain.svg`,
  HTML:       `${DEVICON_BASE}/html5/html5-original.svg`,
  CSS:        `${DEVICON_BASE}/css3/css3-original.svg`,
  Dart:       `${DEVICON_BASE}/dart/dart-original.svg`,
  Kotlin:     `${DEVICON_BASE}/kotlin/kotlin-original.svg`,
  Swift:      `${DEVICON_BASE}/swift/swift-original.svg`,
}

function langIcon(lang) {
  return LANG_ICONS[lang] || null
}

function formatDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

// ── Component ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 3

function Header({ onLogout }) {
  const [repos, setRepos]                 = useState([])
  const [loading, setLoading]             = useState(true)
  const [selected, setSelected]           = useState(new Set())
  const [importing, setImporting]         = useState(false)
  const [importSuccess, setImportSuccess] = useState(null)
  const [importError, setImportError]     = useState(null)
  const [importedRepos, setImportedRepos] = useState([])
  const [importedCount, setImportedCount] = useState(0)
  const [currentPage, setCurrentPage]     = useState(1)
  const [activeTab, setActiveTab]         = useState('browse')
  const [githubUsername, setGithubUsername] = useState(null)
  const [searchQuery, setSearchQuery]     = useState('')
  const [githubInput, setGithubInput]     = useState('')
  const [connecting, setConnecting]       = useState(false)
  const [connectError, setConnectError]   = useState(null)

  useEffect(() => {
    fetchRepos()
    fetchImportedRepos()
    fetchCurrentUser()
  }, [])

  async function fetchCurrentUser() {
    const res = await authFetch(`${BASE_URL}/api/users/me`, {}, onLogout)
    if (!res) return
    const json = await res.json()
    setGithubUsername(json.github_username || null)
  }

  async function fetchRepos() {
    const res = await authFetch(`${BASE_URL}/api/repos`, {}, onLogout)
    if (!res) return
    const json = await res.json()
    setRepos(json.data || [])
    setCurrentPage(1)
    setLoading(false)
  }

  async function fetchImportedRepos() {
    const res = await authFetch(`${BASE_URL}/api/repos/imported`, {}, onLogout)
    if (!res) return
    const json = await res.json()
    setImportedRepos(json.data || [])
    setImportedCount(json.meta?.total || 0)
  }

  function toggleSelect(fullName) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(fullName) ? next.delete(fullName) : next.add(fullName)
      return next
    })
  }

  async function handleImport() {
    if (selected.size === 0 || importing) return
    setImporting(true)
    setImportError(null)
    setImportSuccess(null)

    const res = await authFetch(
      `${BASE_URL}/api/repos/import`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoFullNames: [...selected] }),
      },
      onLogout
    )

    if (!res) { setImporting(false); return }

    const json = await res.json()
    setImporting(false)

    if (json.success) {
      const succeeded = json.data.results.filter(r => r.status === 'succeeded').length
      const failed    = json.data.results.filter(r => r.status === 'failed').length
      setImportSuccess(failed > 0 ? `${succeeded} succeeded, ${failed} failed` : `${succeeded} succeeded`)
      setSelected(new Set())
      fetchImportedRepos()
    } else {
      setImportError(json.error?.message || 'Import failed.')
    }
  }

  async function handleConnectGitHub(e) {
    e.preventDefault()
    if (!githubInput.trim() || connecting) return
    setConnecting(true)
    setConnectError(null)
    const res = await authFetch(`${BASE_URL}/api/users/me/github`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ githubUsername: githubInput.trim() }),
    }, onLogout)
    if (!res) { setConnecting(false); return }
    const json = await res.json()
    setConnecting(false)
    if (json.success) {
      setGithubUsername(json.data.githubUsername)
      setGithubInput('')
      setLoading(true)
      fetchRepos()
    } else {
      setConnectError(json.error?.message || 'Could not connect GitHub account.')
    }
  }

  function handleTabSwitch(tab) {
    setActiveTab(tab)
    if (tab === 'imported') fetchImportedRepos()
  }

  // Pagination derived values (browse tab only)
  const filteredRepos = searchQuery.trim()
    ? repos.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : repos
  const totalPages = Math.max(1, Math.ceil(filteredRepos.length / PAGE_SIZE))
  const startIdx   = (currentPage - 1) * PAGE_SIZE
  const pageRepos  = filteredRepos.slice(startIdx, startIdx + PAGE_SIZE)

  return (
    <div className="min-h-screen bg-gray-50 p-4">

      {/* NAVBAR */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border border-gray-200 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
            R
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-gray-900">Repo2</span>
            <span className="text-indigo-600">Reputation</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {githubUsername ? (
            <div className="px-5 py-2 rounded-full border border-gray-200 bg-white shadow-sm text-green-600 font-semibold text-sm">
              ✓ Connected: @{githubUsername}
            </div>
          ) : (
            <div className="px-5 py-2 rounded-full border border-gray-200 bg-white shadow-sm text-amber-500 font-semibold text-sm">
              ⚠ GitHub not connected
            </div>
          )}
          <button
            onClick={onLogout}
            className="px-5 py-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition font-semibold text-sm"
          >
            Logout
          </button>
        </div>
      </div>

      {/* REPO SECTION */}
      <div className="mt-4 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">

        {/* Tabs + Import button */}
        <div className="flex items-center justify-between mb-5 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-6">
            <button
              onClick={() => handleTabSwitch('browse')}
              className={`font-semibold text-sm pb-3 -mb-4 transition ${
                activeTab === 'browse'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Browse GitHub Repos
            </button>
            <button
              onClick={() => handleTabSwitch('imported')}
              className={`font-semibold text-sm pb-3 -mb-4 transition ${
                activeTab === 'imported'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Imported Repos ({importedCount})
            </button>
            <button
              onClick={() => handleTabSwitch('portfolio')}
              className={`font-semibold text-sm pb-3 -mb-4 transition ${
                activeTab === 'portfolio'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              My Portfolio
            </button>
          </div>

          {activeTab === 'browse' && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-5 py-2.5 rounded-xl text-white font-semibold text-sm shadow-sm transition bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
            >
              {importing ? 'Importing…' : `Import Selected (${selected.size})`}
            </button>
          )}
        </div>

        {/* ── Browse tab ─────────────────────────────────────────────────────── */}
        {activeTab === 'browse' && (
          <>
            {/* Connect GitHub or filter repos */}
            {!githubUsername ? (
              <form onSubmit={handleConnectGitHub} className="mb-5">
                <p className="text-sm text-gray-500 mb-2 font-medium">Enter your GitHub username to load your repositories</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. octocat"
                    value={githubInput}
                    onChange={e => { setGithubInput(e.target.value); setConnectError(null) }}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  <button
                    type="submit"
                    disabled={connecting}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition"
                  >
                    {connecting ? 'Connecting…' : 'Search'}
                  </button>
                </div>
                {connectError && (
                  <p className="mt-2 text-sm text-red-500">{connectError}</p>
                )}
              </form>
            ) : (
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="text"
                  placeholder="Search repositories…"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                  className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                {repos.length > 0 && (
                  <p className="text-sm text-gray-400 whitespace-nowrap">
                    {filteredRepos.length} of {repos.length} repos
                  </p>
                )}
              </div>
            )}

            {importSuccess && (
              <div className="flex items-center justify-between mb-4 px-4 py-3 rounded-xl border border-green-200 bg-green-50 text-green-700 text-sm font-medium">
                <span>✓ Import complete — {importSuccess}</span>
                <button onClick={() => setImportSuccess(null)} className="text-green-500 hover:text-green-700 text-lg leading-none ml-4">×</button>
              </div>
            )}
            {importError && (
              <div className="flex items-center justify-between mb-4 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-medium">
                <span>✗ {importError}</span>
                <button onClick={() => setImportError(null)} className="text-red-400 hover:text-red-600 text-lg leading-none ml-4">×</button>
              </div>
            )}

            <div className="space-y-3">
              {loading ? (
                <p className="text-gray-400 text-sm py-4">Loading repositories…</p>
              ) : filteredRepos.length === 0 ? (
                <p className="text-gray-400 text-sm py-4">
                  {repos.length === 0
                    ? 'No repositories found for this GitHub account.'
                    : `No repositories match "${searchQuery}".`}
                </p>
              ) : (
                pageRepos.map((repo) => {
                  const isChecked = selected.has(repo.fullName)
                  const updated   = formatDate(repo.repoUpdatedAt)
                  const topics    = repo.topics || []

                  return (
                    <div
                      key={repo.fullName}
                      className="group flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-white hover:shadow-sm transition cursor-pointer"
                      onClick={() => toggleSelect(repo.fullName)}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(repo.fullName)}
                          onClick={e => e.stopPropagation()}
                          className="w-4 h-4 accent-indigo-600 flex-shrink-0"
                        />
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                          style={{
                            backgroundColor: langIcon(repo.language) ? '#f8fafc' : langColor(repo.language),
                            border: langIcon(repo.language) ? '1px solid #e5e7eb' : 'none',
                            padding: langIcon(repo.language) ? '10px' : '0',
                          }}
                        >
                          {langIcon(repo.language)
                            ? <img src={langIcon(repo.language)} alt={repo.language} className="w-full h-full object-contain" />
                            : <span className="text-white text-xs font-bold">{(repo.language || '?').slice(0, 2).toUpperCase()}</span>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm">{repo.name}</p>
                          {repo.description && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-lg">{repo.description}</p>
                          )}
                          {topics.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {topics.map(tag => (
                                <span key={tag} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs border border-gray-200">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-4 mt-2">
                            <span className="flex items-center gap-1.5 text-xs text-gray-600">
                              <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: langColor(repo.language) }} />
                              {repo.language || 'Unknown'}
                            </span>
                            <span className="text-xs text-gray-400">☆ {repo.starsCount || 0}</span>
                            {updated && <span className="text-xs text-gray-400">Updated: {updated}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 ml-6 flex-shrink-0">
                        <div className="text-center">
                          <p className="text-gray-400 text-sm">☆</p>
                          <p className="text-sm font-semibold text-gray-700">{repo.starsCount || 0}</p>
                          <p className="text-xs text-gray-400">Stars</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400 text-sm">⑂</p>
                          <p className="text-sm font-semibold text-gray-700">{repo.forksCount || 0}</p>
                          <p className="text-xs text-gray-400">Forks</p>
                        </div>
                        <a
                          href={`https://github.com/${repo.fullName}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 bg-white"
                        >
                          ↗ GitHub
                        </a>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Pagination */}
            {!loading && filteredRepos.length > PAGE_SIZE && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, filteredRepos.length)} of {filteredRepos.length} repositories
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition text-sm"
                  >
                    ‹
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center text-sm font-medium transition ${
                        page === currentPage
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition text-sm"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Imported Repos tab ─────────────────────────────────────────────── */}
        {activeTab === 'imported' && (
          <AnalysisPanel importedRepos={importedRepos} onLogout={onLogout} />
        )}

        {/* ── Portfolio tab ──────────────────────────────────────────────────── */}
        {activeTab === 'portfolio' && (
          <PortfolioBuilder onLogout={onLogout} />
        )}

      </div>
    </div>
  )
}

export default Header
