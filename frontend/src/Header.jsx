import { useEffect, useState } from 'react'
import AnalysisPanel from './AnalysisPanel'
import PortfolioBuilder from './PortfolioBuilder'
import { authFetch, BASE_URL } from './api'
import { RepoCardSkeleton } from './Skeleton'

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
  const [avatarUrl, setAvatarUrl]         = useState(null)
  const [searchQuery, setSearchQuery]     = useState('')
  const [extraUsernames, setExtraUsernames] = useState(() => {
    try { return JSON.parse(localStorage.getItem('r2r_extra_usernames') || '[]') } catch { return [] }
  })
  const [usernameInput, setUsernameInput] = useState('')
  const [extraErrors, setExtraErrors]     = useState([])
  const [selectedAccounts, setSelectedAccounts] = useState(new Set())
  const [showOnboarding, setShowOnboarding] = useState(
    () => localStorage.getItem('r2r_onboarding_dismissed') !== 'true'
  )
  const [removeConfirm, setRemoveConfirm]       = useState(null)
  const [connectedAccounts, setConnectedAccounts]     = useState([])
  const [appInstallations, setAppInstallations]       = useState([])
  const [connectBanner, setConnectBanner]             = useState(null)
  const [analyzingFullNames, setAnalyzingFullNames]   = useState(new Set())

  useEffect(() => {
    fetchRepos()
    fetchImportedRepos()
    fetchCurrentUser()
    fetchConnectedAccounts()
    fetchAppInstallations()

    const params = new URLSearchParams(window.location.search)
    const justConnected = params.get('connected')
    const justInstalled = params.get('installed')
    if (justConnected) {
      setConnectBanner(`@${justConnected} connected — private repositories are now accessible`)
      window.history.replaceState({}, '', '/')
    } else if (justInstalled) {
      setConnectBanner(`@${justInstalled} connected via GitHub App — public and private repositories are now accessible`)
      window.history.replaceState({}, '', '/')
    }
  }, [])

  // Poll analysis status for repos still showing "Analyzing..." badge — clear when done
  useEffect(() => {
    if (analyzingFullNames.size === 0) return
    const interval = setInterval(async () => {
      const token = localStorage.getItem('token')
      if (!token) return
      const done = new Set()
      await Promise.all([...analyzingFullNames].map(async fullName => {
        const repo = importedRepos.find(r => r.full_name === fullName)
        if (!repo) { done.add(fullName); return }
        try {
          const res = await fetch(`${BASE_URL}/api/deep-analysis/${repo.id}/latest`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          const json = await res.json()
          if (json?.data?.status && ['completed', 'partial', 'failed', 'cancelled'].includes(json.data.status)) {
            done.add(fullName)
          }
        } catch { /* network blip — try again next tick */ }
      }))
      if (done.size > 0) {
        setAnalyzingFullNames(prev => {
          const next = new Set(prev)
          done.forEach(n => next.delete(n))
          return next
        })
      }
    }, 8000)
    return () => clearInterval(interval)
  }, [analyzingFullNames, importedRepos])

  // ── Derived ───────────────────────────────────────────────────────────────────

  const importedFullNames = new Set(importedRepos.map(r => r.full_name))

  const repoCounts = repos.reduce((acc, r) => {
    const key = (r.accountUsername || '').toLowerCase()
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  const connectedUsernames = new Set([
    ...(githubUsername ? [githubUsername.toLowerCase()] : []),
    ...connectedAccounts.map(a => a.github_username.toLowerCase()),
    ...appInstallations.map(i => i.account_login.toLowerCase()),
  ])

  const allAccounts = [
    ...(githubUsername ? [{ username: githubUsername, isPrimary: true, isConnected: true, hasPrivateAccess: true }] : []),
    // Secondary OAuth accounts
    ...connectedAccounts
      .filter(a => !a.is_primary)
      .map(a => ({ username: a.github_username, isPrimary: false, isConnected: true, hasPrivateAccess: true, accountId: a.id, source: 'oauth' })),
    // GitHub App installations
    ...appInstallations
      .filter(i => !connectedAccounts.some(a => a.github_username.toLowerCase() === i.account_login.toLowerCase()))
      .map(i => ({ username: i.account_login, isPrimary: false, isConnected: true, hasPrivateAccess: true, installationId: i.id, source: 'app' })),
    // Public-only extra usernames — skip any already connected
    ...extraUsernames
      .filter(u => !connectedUsernames.has(u.toLowerCase()))
      .map(u => ({ username: u, isPrimary: false, isConnected: false, hasPrivateAccess: false })),
  ]

  // Empty selectedAccounts = show all; otherwise union of selected accounts
  const accountFiltered = selectedAccounts.size === 0
    ? repos
    : repos.filter(r =>
        selectedAccounts.has((r.accountUsername || githubUsername || '').toLowerCase())
      )

  const filteredRepos = searchQuery.trim()
    ? accountFiltered.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : accountFiltered

  const totalPages = Math.max(1, Math.ceil(filteredRepos.length / PAGE_SIZE))
  const startIdx   = (currentPage - 1) * PAGE_SIZE
  const pageRepos  = filteredRepos.slice(startIdx, startIdx + PAGE_SIZE)

  // ── Data fetchers ─────────────────────────────────────────────────────────────

  async function fetchCurrentUser() {
    const res = await authFetch(`${BASE_URL}/api/users/me`, {}, onLogout)
    if (!res) return
    const json = await res.json()
    setGithubUsername(json.github_username || null)
    setAvatarUrl(json.avatar_url || null)
  }

  async function fetchRepos(extra = extraUsernames) {
    const params = extra.length > 0 ? `?extra=${extra.join(',')}` : ''
    const res = await authFetch(`${BASE_URL}/api/repos${params}`, {}, onLogout)
    if (!res) return
    const json = await res.json()
    setRepos(json.data || [])
    setExtraErrors(json.meta?.extraErrors || [])
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

  async function fetchConnectedAccounts() {
    const res = await authFetch(`${BASE_URL}/api/github-accounts`, {}, onLogout)
    if (!res) return
    const json = await res.json()
    if (json.success) setConnectedAccounts(json.data || [])
  }

  async function fetchAppInstallations() {
    const res = await authFetch(`${BASE_URL}/api/github-app/installations`, {}, onLogout)
    if (!res) return
    const json = await res.json()
    if (json.success) setAppInstallations(json.data || [])
  }

  async function handleStopAnalysis() {
    await authFetch(`${BASE_URL}/api/deep-analysis/cancel-pending`, { method: 'POST' }, onLogout)
    setAnalyzingFullNames(new Set())
  }

  function connectGithubAccount() {
    const token = localStorage.getItem('token')
    window.location.href = `${BASE_URL}/api/auth/github?mode=connect&token=${encodeURIComponent(token)}`
  }

  async function disconnectGithubAccount(accountId, username) {
    const res = await authFetch(`${BASE_URL}/api/github-accounts/${accountId}`, { method: 'DELETE' }, onLogout)
    if (!res) return
    setConnectedAccounts(prev => prev.filter(a => a.id !== accountId))
    setSelectedAccounts(prev => { const next = new Set(prev); next.delete(username.toLowerCase()); return next })
    setRemoveConfirm(null)
    fetchRepos()
  }

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function toggleAccountFilter(username) {
    const key = username.toLowerCase()
    setSelectedAccounts(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
    setCurrentPage(1)
  }

  function addExtraUsername() {
    let raw = usernameInput.trim()
    // If a GitHub URL was pasted (e.g. https://github.com/username or .../username/repo),
    // extract just the username (first path segment after the host)
    try {
      const url = new URL(raw)
      if (url.hostname === 'github.com') {
        raw = url.pathname.split('/').filter(Boolean)[0] || raw
      }
    } catch { /* not a URL — use as-is */ }
    const u = raw.replace(/^@/, '')
    if (!u || extraUsernames.map(x => x.toLowerCase()).includes(u.toLowerCase())) {
      setUsernameInput('')
      return
    }
    const next = [...extraUsernames, u]
    setExtraUsernames(next)
    localStorage.setItem('r2r_extra_usernames', JSON.stringify(next))
    setUsernameInput('')
    fetchRepos(next)
  }

  function removeExtraUsername(u) {
    const next = extraUsernames.filter(x => x !== u)
    setExtraUsernames(next)
    localStorage.setItem('r2r_extra_usernames', JSON.stringify(next))
    setSelectedAccounts(prev => {
      const nextSet = new Set(prev)
      nextSet.delete(u.toLowerCase())
      return nextSet
    })
    setRemoveConfirm(null)
    fetchRepos(next)
  }

  function toggleSelect(fullName) {
    if (importedFullNames.has(fullName)) return
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
      const importedNames = new Set(
        json.data.results.filter(r => r.status === 'succeeded').map(r => r.fullName)
      )
      setAnalyzingFullNames(importedNames)
      setSelected(new Set())
      fetchImportedRepos()
      if (failed > 0) {
        setImportError(`${failed} ${failed === 1 ? 'repository' : 'repositories'} failed to import.`)
      }
      // Auto-switch to Portfolio Builder — analysis is running in the background
      setActiveTab('portfolio')
    } else {
      setImportError(json.error?.message || 'Import failed.')
    }
  }

  function handleTabSwitch(tab) {
    setActiveTab(tab)
  }

  function dismissOnboarding() {
    localStorage.setItem('r2r_onboarding_dismissed', 'true')
    setShowOnboarding(false)
  }

  // ── Render ────────────────────────────────────────────────────────────────────

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
          {githubUsername && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-white shadow-sm">
              {avatarUrl
                ? <img src={avatarUrl} alt={githubUsername} className="w-6 h-6 rounded-full" />
                : <span className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold">{githubUsername[0].toUpperCase()}</span>
              }
              <span className="text-sm font-semibold text-gray-700">@{githubUsername}</span>
            </div>
          )}
          <a
            href="/settings"
            className="px-5 py-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition font-semibold text-sm"
          >
            Settings
          </a>
          <button
            onClick={onLogout}
            className="px-5 py-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition font-semibold text-sm"
          >
            Logout
          </button>
        </div>
      </div>

      {/* MAIN SECTION */}
      <div className="mt-4 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">

        {/* Tabs + Import button */}
        <div className="flex items-center justify-between mb-5 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-6">
            {[
              { key: 'browse',    label: 'Browse GitHub Repos' },
              { key: 'portfolio', label: 'My Portfolio' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => handleTabSwitch(tab.key)}
                className={`font-semibold text-sm pb-3 -mb-4 transition ${
                  activeTab === tab.key
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'browse' && (
            <button
              onClick={handleImport}
              disabled={importing || selected.size === 0}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition ${
                selected.size === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {importing
                ? 'Importing…'
                : selected.size === 0
                ? 'Select repositories to import'
                : `Import ${selected.size} ${selected.size === 1 ? 'Repository' : 'Repositories'}`}
            </button>
          )}
        </div>

        {/* ── Browse tab ─────────────────────────────────────────────────────── */}
        {activeTab === 'browse' && (
          <>
            {/* PROGRESS STEPPER */}
            {showOnboarding && (() => {
              const step1Done = importedRepos.length > 0
              const step2Done = importedRepos.length > 0 && analyzingFullNames.size === 0
              const steps = [
                { n: 1, label: 'Import Repos',    sub: 'Select & import from GitHub', done: step1Done },
                { n: 2, label: 'AI Analysis',     sub: 'Runs automatically in background', done: step2Done },
                { n: 3, label: 'Build Portfolio', sub: 'Switch to Portfolio tab',     done: false },
              ]
              return (
                <div className="mb-5 px-5 py-4 rounded-xl border border-gray-200 bg-white shadow-sm relative">
                  <button
                    onClick={dismissOnboarding}
                    className="absolute top-3 right-3 text-gray-300 hover:text-gray-500 text-xl leading-none"
                  >×</button>
                  <p className="text-xs font-semibold text-gray-400 mb-4 uppercase tracking-wider">Your progress</p>
                  <div className="flex items-start">
                    {steps.map((step, i) => {
                      const isCurrent = !step.done && (i === 0 || steps[i - 1].done)
                      return (
                        <div key={step.n} className="flex items-start flex-1">
                          <div className="flex flex-col items-center flex-1">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                              step.done   ? 'bg-green-500 text-white'
                              : isCurrent ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                                          : 'bg-gray-100 text-gray-400'
                            }`}>
                              {step.done ? '✓' : step.n}
                            </div>
                            <p className={`text-xs mt-2 font-semibold text-center leading-tight ${
                              step.done ? 'text-green-600' : isCurrent ? 'text-indigo-700' : 'text-gray-400'
                            }`}>{step.label}</p>
                            <p className="text-xs text-gray-400 text-center leading-tight mt-0.5 hidden sm:block">{step.sub}</p>
                          </div>
                          {i < steps.length - 1 && (
                            <div className={`h-0.5 flex-1 mt-4 mx-2 transition-all ${steps[i].done ? 'bg-green-400' : 'bg-gray-200'}`} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            {/* Analysis-in-progress banner */}
            {analyzingFullNames.size > 0 && (
              <div className="flex items-center justify-between mb-4 px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50">
                <span className="text-sm text-blue-700 font-medium">
                  ⏳ Analyzing {analyzingFullNames.size} {analyzingFullNames.size === 1 ? 'repo' : 'repos'} in the background…
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTabSwitch('portfolio')}
                    className="px-3 py-1.5 rounded-lg border border-blue-300 bg-white text-blue-700 text-xs font-semibold hover:bg-blue-50 transition"
                  >
                    View progress →
                  </button>
                  <button
                    onClick={handleStopAnalysis}
                    className="px-3 py-1.5 rounded-lg border border-red-200 bg-white text-red-600 text-xs font-semibold hover:bg-red-50 transition"
                  >
                    ⏹ Stop
                  </button>
                </div>
              </div>
            )}

            {/* Connect-success banner */}
            {connectBanner && (
              <div className="flex items-center justify-between mb-4 px-4 py-3 rounded-xl border border-green-200 bg-green-50 text-green-700 text-sm font-medium">
                <span>✓ {connectBanner}</span>
                <button onClick={() => setConnectBanner(null)} className="text-green-500 hover:text-green-700 text-lg leading-none ml-4">×</button>
              </div>
            )}

            {/* CONNECTED ACCOUNT CARDS — clickable filters */}
            {!loading && allAccounts.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-5">
                {allAccounts.map(acc => {
                  const key         = acc.username.toLowerCase()
                  const isSelected  = selectedAccounts.has(key)
                  const isConfirming = removeConfirm === acc.username
                  const count       = repoCounts[key] || 0

                  return (
                    <div
                      key={acc.username}
                      onClick={() => !isConfirming && toggleAccountFilter(acc.username)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition select-none ${
                        isConfirming
                          ? 'border-red-200 bg-red-50 cursor-default'
                          : isSelected
                          ? 'border-indigo-400 bg-indigo-50 shadow-sm cursor-pointer'
                          : 'border-gray-200 bg-gray-50 hover:border-gray-300 cursor-pointer'
                      }`}
                    >
                      {/* Avatar — shows checkmark when selected */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 transition ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : acc.isPrimary
                          ? 'bg-indigo-100 text-indigo-600'
                          : acc.isConnected
                          ? 'bg-green-100 text-green-600'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {isSelected
                          ? (
                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )
                          : acc.username[0].toUpperCase()
                        }
                      </div>

                      {/* Account info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-semibold truncate ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
                            @{acc.username}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            isSelected
                              ? 'bg-indigo-200 text-indigo-800'
                              : acc.isPrimary
                              ? 'bg-indigo-100 text-indigo-700'
                              : acc.isConnected
                              ? 'bg-green-100 text-green-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {acc.isPrimary ? 'Primary Account' : acc.isConnected ? 'Connected Account' : 'Public Account'}
                          </span>
                          {isSelected && (
                            <span className="text-xs font-semibold text-indigo-600">Viewing</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-xs ${isSelected ? 'text-indigo-600' : 'text-gray-500'}`}>
                            {count} {count === 1 ? 'repository' : 'repositories'}
                          </span>
                          <span className={`text-xs ${isSelected ? 'text-indigo-300' : 'text-gray-300'}`}>·</span>
                          <span className={`text-xs font-medium ${
                            isSelected
                              ? 'text-indigo-500'
                              : acc.hasPrivateAccess
                              ? 'text-green-500'
                              : 'text-gray-400'
                          }`}>
                            {acc.hasPrivateAccess ? '🔒 Public + Private' : '🌐 Public Only'}
                          </span>
                        </div>
                      </div>

                      {/* Remove button (non-primary accounts only) */}
                      {!acc.isPrimary && (
                        <div className="ml-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                          {isConfirming ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-red-600 font-medium whitespace-nowrap">Remove?</span>
                              <button
                                onClick={() => {
                                  if (acc.source === 'app') {
                                    authFetch(`${BASE_URL}/api/github-app/installations/${acc.installationId}`, { method: 'DELETE' }, onLogout)
                                      .then(() => { setAppInstallations(prev => prev.filter(i => i.id !== acc.installationId)); fetchRepos() })
                                  } else if (acc.isConnected) {
                                    disconnectGithubAccount(acc.accountId, acc.username)
                                  } else {
                                    removeExtraUsername(acc.username)
                                  }
                                }}
                                className="px-2 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition"
                              >Yes</button>
                              <button
                                onClick={() => setRemoveConfirm(null)}
                                className="px-2 py-1 rounded-lg bg-white hover:bg-gray-100 text-gray-600 text-xs font-semibold border border-gray-200 transition"
                              >Cancel</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setRemoveConfirm(acc.username)}
                              className={`text-lg leading-none transition ${
                                isSelected ? 'text-indigo-300 hover:text-red-400' : 'text-gray-300 hover:text-red-400'
                              }`}
                              title="Remove this account from your repository view"
                            >×</button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Add accounts */}
                <div className="flex flex-col justify-center gap-2">
                  {/* Add public username — no auth */}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="+ Add Public Username"
                      value={usernameInput}
                      onChange={e => setUsernameInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addExtraUsername()}
                      className="px-3 py-2 rounded-xl border border-dashed border-gray-300 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 w-52"
                    />
                    {usernameInput.trim() && (
                      <button
                        onClick={addExtraUsername}
                        className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
                      >
                        Add
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 pl-1">Public repos only — no login required</p>
                </div>
              </div>
            )}

            {/* SEARCH */}
            <div className="flex items-center gap-3 mb-4">
              <input
                type="text"
                placeholder="Search repositories…"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              {!loading && repos.length > 0 && searchQuery.trim() && (
                <p className="text-sm text-gray-400 whitespace-nowrap">
                  {filteredRepos.length} of {repos.length}
                </p>
              )}
            </div>

            {/* Extra username errors */}
            {extraErrors.map(e => (
              <div key={e.username} className="mb-3 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-xs">
                {e.error}
              </div>
            ))}

            {/* Import status banners */}
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

            {/* REPO LIST */}
            <div className="space-y-3">
              {loading ? (
                <>
                  <RepoCardSkeleton />
                  <RepoCardSkeleton />
                  <RepoCardSkeleton />
                </>
              ) : filteredRepos.length === 0 ? (
                repos.length === 0 ? (
                  <div className="flex flex-col items-center py-10 px-4 text-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
                      <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-base mb-1">No repositories found</p>
                      <p className="text-sm text-gray-400 max-w-xs">
                        Your connected GitHub account doesn't have any public repositories yet.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2.5 text-xs text-left bg-gray-50 rounded-xl p-4 w-full max-w-xs border border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 mb-1">Once you have repos, here's how it works:</p>
                      {[
                        'Select repos using the checkboxes',
                        'Click Import — AI analysis runs automatically',
                        'Switch to Portfolio tab to build your profile',
                      ].map((text, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">{i + 1}</span>
                          <span className="text-gray-500">{text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : selectedAccounts.size > 0 && !searchQuery.trim() ? (
                  <div className="flex flex-col items-center py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                      <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    </div>
                    <p className="font-semibold text-gray-700 mb-1">No repositories for this account</p>
                    <button
                      onClick={() => { setSelectedAccounts(new Set()); setCurrentPage(1) }}
                      className="mt-3 text-xs font-semibold text-indigo-500 hover:text-indigo-600"
                    >
                      Show all accounts
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                      <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
                      </svg>
                    </div>
                    <p className="font-semibold text-gray-700 mb-1">No results for "{searchQuery}"</p>
                    <p className="text-sm text-gray-400">Try a different name or description keyword.</p>
                    <button
                      onClick={() => { setSearchQuery(''); setCurrentPage(1) }}
                      className="mt-3 text-xs font-semibold text-indigo-500 hover:text-indigo-600"
                    >
                      Clear search
                    </button>
                  </div>
                )
              ) : (
                pageRepos.map((repo) => {
                  const isChecked  = selected.has(repo.fullName)
                  const isImported = importedFullNames.has(repo.fullName)
                  const updated    = formatDate(repo.repoUpdatedAt)
                  const topics     = repo.topics || []
                  const owner      = repo.accountUsername || githubUsername || ''

                  return (
                    <div
                      key={repo.fullName}
                      className={`flex items-center justify-between p-4 rounded-xl border transition ${
                        isImported
                          ? 'border-gray-100 bg-gray-50 cursor-default'
                          : isChecked
                          ? 'border-indigo-300 bg-indigo-50 cursor-pointer'
                          : 'border-gray-200 bg-white hover:shadow-sm cursor-pointer'
                      }`}
                      onClick={() => toggleSelect(repo.fullName)}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isImported}
                          onChange={() => toggleSelect(repo.fullName)}
                          onClick={e => e.stopPropagation()}
                          className="w-4 h-4 accent-indigo-600 flex-shrink-0 disabled:opacity-40"
                        />

                        {/* Language icon */}
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
                          {/* Row 1: name + owner badge + imported badge */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`font-bold text-base leading-tight ${isImported ? 'text-gray-500' : 'text-gray-900'}`}>
                              {repo.name}
                            </p>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200 whitespace-nowrap">
                              <span className="text-slate-400 font-normal">Owner:</span>
                              @{owner}
                            </span>
                            {isImported && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-50 text-green-700 text-xs font-semibold border border-green-200 whitespace-nowrap">
                                ✓ Imported
                              </span>
                            )}
                            {isImported && analyzingFullNames.has(repo.fullName) && (
                              <button
                                onClick={e => { e.stopPropagation(); handleTabSwitch('portfolio') }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200 whitespace-nowrap hover:bg-blue-100 transition cursor-pointer"
                                title="Click to see analysis progress"
                              >
                                ⏳ Analyzing… (click to track)
                              </button>
                            )}
                          </div>

                          {/* Description */}
                          {repo.description && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xl">{repo.description}</p>
                          )}

                          {/* Topics */}
                          {topics.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {topics.map(tag => (
                                <span key={tag} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs border border-gray-200">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Language · visibility · date */}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border"
                              style={{
                                backgroundColor: langColor(repo.language) + '18',
                                borderColor:     langColor(repo.language) + '55',
                                color:           langColor(repo.language),
                              }}
                            >
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: langColor(repo.language) }} />
                              {repo.language || 'Unknown'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                              repo.private
                                ? 'bg-gray-50 text-gray-500 border-gray-200'
                                : 'bg-green-50 text-green-600 border-green-200'
                            }`}>
                              {repo.private ? '🔒 Private' : '🌐 Public'}
                            </span>
                            {updated && <span className="text-xs text-gray-400">Updated {updated}</span>}
                          </div>
                        </div>
                      </div>

                      {/* GitHub link */}
                      <div className="flex items-center ml-6 flex-shrink-0">
                        <a
                          href={`https://github.com/${repo.fullName}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 bg-white transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                          </svg>
                          GitHub
                        </a>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* PAGINATION */}
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
                  >‹</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center text-sm font-medium transition ${
                        page === currentPage
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >{page}</button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition text-sm"
                  >›</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Portfolio tab ──────────────────────────────────────────────────── */}
        {activeTab === 'portfolio' && (
          <PortfolioBuilder
            onLogout={onLogout}
            onGoToBrowse={() => handleTabSwitch('browse')}
            onRepoDeleted={(repoId, fullName) => {
              setImportedRepos(prev => prev.filter(r => r.id !== repoId))
              if (fullName) setAnalyzingFullNames(prev => { const n = new Set(prev); n.delete(fullName); return n })
            }}
          />
        )}

      </div>
    </div>
  )
}

export default Header
