import { useState, useEffect, useRef } from 'react'
import { authFetch, BASE_URL } from './api'

const POLL_INTERVAL_MS = 3000

// ── Helpers ───────────────────────────────────────────────────────────────────

const LANG_COLORS = {
  TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572A5',
  Ruby: '#701516', Go: '#00ADD8', Java: '#b07219', Rust: '#dea584',
  'C++': '#f34b7d', Shell: '#89e051', HTML: '#e34c26', CSS: '#563d7c',
}

function langColor(lang) { return LANG_COLORS[lang] || '#8b949e' }

function statusBadge(status) {
  const map = {
    queued:    { bg: '#fef9c3', color: '#854d0e', border: '#fde047', label: 'Queued' },
    running:   { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd', label: 'Analyzing…' },
    completed: { bg: '#dcfce7', color: '#166534', border: '#86efac', label: '✓ Analyzed' },
    failed:    { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', label: '✗ Failed' },
  }
  const s = map[status] || map.failed
  return (
    <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  )
}

const TECH_CATEGORY_COLORS = {
  Frontend: { bg: '#ede9fe', color: '#5b21b6', border: '#c4b5fd' },
  Backend:  { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
  Database: { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
  DevOps:   { bg: '#dcfce7', color: '#166534', border: '#86efac' },
  Mobile:   { bg: '#fce7f3', color: '#9d174d', border: '#f9a8d4' },
  AI:       { bg: '#f3e8ff', color: '#6b21a8', border: '#d8b4fe' },
  Testing:  { bg: '#ecfdf5', color: '#065f46', border: '#6ee7b7' },
  Other:    { bg: '#f3f4f6', color: '#374151', border: '#d1d5db' },
}

function techChipStyle(category) { return TECH_CATEGORY_COLORS[category] || TECH_CATEGORY_COLORS.Other }

function confidenceColor(label) {
  if (label === 'High')   return '#16a34a'
  if (label === 'Medium') return '#92400e'
  return '#991b1b'
}

function formatAnalyzedDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${date} • ${time}`
}

// ── SectionCard ───────────────────────────────────────────────────────────────

function SectionCard({ icon, title, children }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', backgroundColor: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <span style={{ color: '#6366f1', fontSize: '16px' }}>{icon}</span>
        <p style={{ margin: 0, fontWeight: 'bold', fontSize: '15px', color: '#111827' }}>{title}</p>
      </div>
      {children}
    </div>
  )
}

// ── AnalysisDetail ────────────────────────────────────────────────────────────

function AnalysisDetail({ repo, analysis, onBack, onLogout }) {
  const lang      = repo.primary_language || repo.language
  const stars     = (repo.stars_count ?? repo.stargazers_count ?? 0).toLocaleString()
  const forks     = repo.forks_count ?? 0
  const analyzedAt = formatAnalyzedDate(analysis.completedAt || analysis.updatedAt)

  const [readmeLoading, setReadmeLoading] = useState(false)
  const [readmeContent, setReadmeContent] = useState(null)
  const [readmeError, setReadmeError]     = useState(null)
  const [readmeCopied, setReadmeCopied]   = useState(false)

  async function handleGenerateReadme() {
    setReadmeLoading(true)
    setReadmeError(null)
    setReadmeContent(null)
    try {
      const res = await authFetch(
        `${BASE_URL}/api/repos/${repo.id}/generate-readme`,
        { method: 'POST' },
        onLogout
      )
      const json = await res?.json()
      if (json?.success) {
        setReadmeContent(json.data.readme)
      } else {
        setReadmeError(json?.error?.message || 'Failed to generate README.')
      }
    } catch {
      setReadmeError('Network error — is the backend running?')
    }
    setReadmeLoading(false)
  }

  function handleCopyReadme() {
    navigator.clipboard.writeText(readmeContent).then(() => {
      setReadmeCopied(true)
      setTimeout(() => setReadmeCopied(false), 2000)
    })
  }

  const HIGHLIGHT_META = [
    { key: 'purpose',             label: 'Purpose',             icon: '🎯' },
    { key: 'strengths',           label: 'Strengths',           icon: '💪' },
    { key: 'use_cases',           label: 'Use Cases',           icon: '📱' },
    { key: 'repository_activity', label: 'Repository Activity', icon: '📈' },
  ]

  return (
    <div>

      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '14px', fontWeight: '600', padding: 0, display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          ← Back to Repositories
        </button>
        {analyzedAt && (
          <span style={{ fontSize: '13px', color: '#9ca3af' }}>Analyzed on {analyzedAt}</span>
        )}
      </div>

      {/* Repo header */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', backgroundColor: 'white', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            {/* Icon */}
            <div style={{ width: 52, height: 52, borderRadius: '12px', backgroundColor: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6d28d9', fontSize: '20px', flexShrink: 0 }}>
              ▤
            </div>
            <div>
              <a
                href={`https://github.com/${repo.full_name ?? repo.fullName}`}
                target="_blank" rel="noopener noreferrer"
                style={{ fontWeight: 'bold', fontSize: '20px', color: '#111827', textDecoration: 'none' }}
              >
                {repo.name}
              </a>
              {repo.description && (
                <p style={{ margin: '4px 0 10px', fontSize: '13px', color: '#6b7280' }}>{repo.description}</p>
              )}
              {/* Meta row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: '#6b7280', flexWrap: 'wrap' }}>
                {lang && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: langColor(lang), display: 'inline-block', flexShrink: 0 }} />
                    {lang}
                  </span>
                )}
                <span>⭐ {stars}</span>
                {forks > 0 && <span>🍴 {forks.toLocaleString()}</span>}
              </div>
            </div>
          </div>
          {/* Analyzed badge */}
          <span style={{ padding: '6px 14px', borderRadius: '20px', backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac', fontSize: '13px', fontWeight: 'bold', flexShrink: 0 }}>
            ✓ Analyzed
          </span>
        </div>
      </div>

      {/* Two-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* LEFT column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {analysis.summary && (
            <SectionCard icon="▤" title="Project Summary">
              <p style={{ margin: 0, fontSize: '14px', color: '#374151', lineHeight: '1.7' }}>{analysis.summary}</p>
            </SectionCard>
          )}

          {analysis.technologies?.length > 0 && (
            <SectionCard icon="⟨/⟩" title="Technologies Used">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {analysis.technologies.map((tech, i) => {
                  const s = techChipStyle(tech.category)
                  return (
                    <span
                      key={i}
                      title={`${tech.category} — ${Math.round(tech.confidence * 100)}% confidence`}
                      style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}`, cursor: 'default' }}
                    >
                      {tech.name}
                    </span>
                  )
                })}
              </div>
            </SectionCard>
          )}

          {analysis.whatItDoes && (
            <SectionCard icon="⚡" title="What It Does">
              <p style={{ margin: 0, fontSize: '14px', color: '#374151', lineHeight: '1.7' }}>{analysis.whatItDoes}</p>
            </SectionCard>
          )}

        </div>

        {/* RIGHT column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {analysis.keyTakeaways?.length > 0 && (
            <SectionCard icon="☆" title="Key Takeaways">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {analysis.keyTakeaways.map((t, i) => {
                  const isPositive = t.status === 'positive'
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px' }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                        backgroundColor: isPositive ? '#dcfce7' : '#fef9c3',
                        border: `1px solid ${isPositive ? '#86efac' : '#fde047'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', color: isPositive ? '#16a34a' : '#92400e',
                      }}>
                        {isPositive ? '✓' : '!'}
                      </span>
                      <span style={{ color: '#374151', lineHeight: '1.5' }}>{t.text}</span>
                    </div>
                  )
                })}
              </div>
            </SectionCard>
          )}

          {analysis.highlights && (
            <SectionCard icon="🏆" title="Project Highlights">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {HIGHLIGHT_META.map(({ key, label, icon }) => analysis.highlights[key] && (
                  <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>{icon}</span>
                    <div>
                      <p style={{ margin: '0 0 2px', fontWeight: 'bold', fontSize: '13px', color: '#111827' }}>{label}</p>
                      <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', lineHeight: '1.5' }}>{analysis.highlights[key]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

        </div>
      </div>

      {/* Overall Confidence */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '28px 20px', backgroundColor: 'white', textAlign: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px', color: '#6366f1', fontSize: '15px', fontWeight: 'bold' }}>
          <span>🛡</span> Overall Confidence
        </div>
        <p style={{ margin: '0 0 6px', fontSize: '26px', fontWeight: 'bold', color: confidenceColor(analysis.confidenceLabel) }}>
          {analysis.confidenceLabel || 'Medium'}
        </p>
        <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>
          This analysis is based on repository content, documentation, and metadata.
        </p>
      </div>

      {/* Generate README */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', backgroundColor: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: readmeContent ? '16px' : 0 }}>
          <div>
            <p style={{ margin: '0 0 4px', fontWeight: 'bold', fontSize: '15px', color: '#111827' }}>Generate README</p>
            <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
              AI writes a README.md based on this analysis. Copy it and commit it to your repo.
            </p>
          </div>
          <button
            onClick={handleGenerateReadme}
            disabled={readmeLoading}
            style={{
              flexShrink: 0, marginLeft: '16px',
              padding: '9px 20px', borderRadius: '8px', border: 'none',
              backgroundColor: readmeLoading ? '#a5b4fc' : '#4f46e5',
              color: 'white', fontWeight: 'bold', fontSize: '13px',
              cursor: readmeLoading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s',
            }}
          >
            {readmeLoading ? 'Generating…' : readmeContent ? 'Regenerate' : 'Generate README'}
          </button>
        </div>

        {readmeError && (
          <p style={{ margin: '12px 0 0', fontSize: '13px', color: '#dc2626' }}>{readmeError}</p>
        )}

        {readmeContent && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>README.md preview</span>
              <button
                onClick={handleCopyReadme}
                style={{
                  padding: '5px 14px', borderRadius: '6px', border: '1px solid #e5e7eb',
                  backgroundColor: readmeCopied ? '#dcfce7' : '#f9fafb',
                  color: readmeCopied ? '#166534' : '#374151',
                  fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {readmeCopied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <pre style={{
              margin: 0, padding: '16px', borderRadius: '8px',
              backgroundColor: '#0f172a', color: '#e2e8f0',
              fontSize: '12px', lineHeight: '1.7', fontFamily: "'Fira Code', 'Cascadia Code', monospace",
              overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              maxHeight: '420px', overflowY: 'auto',
            }}>
              {readmeContent}
            </pre>
            <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#9ca3af' }}>
              Commit this as <code style={{ backgroundColor: '#f3f4f6', padding: '1px 5px', borderRadius: '4px' }}>README.md</code> to your repo — your next analysis will have higher confidence.
            </p>
          </div>
        )}
      </div>

    </div>
  )
}

// ── AnalysisPanel (list view) ─────────────────────────────────────────────────

function AnalysisPanel({ importedRepos, onLogout }) {
  const [analysisMap, setAnalysisMap]   = useState({})
  const [triggering, setTriggering]     = useState(false)
  const [triggerError, setTriggerError] = useState(null)
  const [detailRepo, setDetailRepo]     = useState(null)
  const pollRef = useRef(null)

  useEffect(() => {
    if (!importedRepos.length) return
    importedRepos.forEach(repo => loadRepoAnalysis(repo.id))
  }, [importedRepos])

  useEffect(() => {
    const hasActive = Object.values(analysisMap).some(a => a.status === 'queued' || a.status === 'running')
    if (hasActive && !pollRef.current) {
      pollRef.current = setInterval(() => pollActive(), POLL_INTERVAL_MS)
    }
    if (!hasActive && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }
  }, [analysisMap])

  function loadRepoAnalysis(repositoryId) {
    authFetch(`${BASE_URL}/api/analysis/repo/${repositoryId}`, {}, onLogout)
      .then(res => res?.json())
      .then(data => {
        if (data?.success) setAnalysisMap(prev => ({ ...prev, [repositoryId]: { ...data.data, repositoryId } }))
      })
      .catch(() => {})
  }

  function pollActive() {
    Object.values(analysisMap)
      .filter(a => a.status === 'queued' || a.status === 'running')
      .forEach(a => {
        authFetch(`${BASE_URL}/api/analysis/${a.analysisId}`, {}, onLogout)
          .then(res => res?.json())
          .then(data => {
            if (data?.success) setAnalysisMap(prev => ({ ...prev, [a.repositoryId]: { ...data.data, repositoryId: a.repositoryId } }))
          })
          .catch(() => {})
      })
  }

  function handleAnalyzeAll() {
    const toAnalyze = importedRepos.filter(r => {
      const a = analysisMap[r.id]
      return !a || (a.status !== 'completed' && a.status !== 'queued' && a.status !== 'running')
    })
    if (!toAnalyze.length) return

    setTriggering(true)
    setTriggerError(null)

    authFetch(`${BASE_URL}/api/analysis/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repositoryIds: toAnalyze.map(r => r.id) }),
    }, onLogout)
      .then(res => res?.json())
      .then(data => {
        if (data?.success) {
          data.data.analyses.forEach(a => {
            setAnalysisMap(prev => ({ ...prev, [a.repositoryId]: { analysisId: a.analysisId, status: a.status, repositoryId: a.repositoryId } }))
          })
        } else {
          setTriggerError(data?.error?.message || 'Failed to start analysis.')
        }
        setTriggering(false)
      })
      .catch(() => { setTriggerError('Network error.'); setTriggering(false) })
  }

  if (detailRepo) {
    const analysis = analysisMap[detailRepo.id]
    return <AnalysisDetail repo={detailRepo} analysis={analysis} onBack={() => setDetailRepo(null)} onLogout={onLogout} />
  }

  const notYetAnalyzed = importedRepos.filter(r => {
    const a = analysisMap[r.id]
    return !a || (a.status !== 'completed' && a.status !== 'queued' && a.status !== 'running')
  })

  const anyActive = Object.values(analysisMap).some(a => a.status === 'queued' || a.status === 'running')

  if (!importedRepos.length) {
    return <p style={{ color: '#6b7280', fontSize: '14px' }}>No repos imported yet. Go to Browse and import repos first.</p>
  }

  return (
    <>
      {/* Action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{ fontSize: '14px', color: '#6b7280' }}>
          {importedRepos.length} imported repo{importedRepos.length !== 1 ? 's' : ''}
          {anyActive && <span style={{ marginLeft: '10px', color: '#2563eb' }}>● Analyzing…</span>}
        </span>
        {notYetAnalyzed.length > 0 && (
          <button
            onClick={handleAnalyzeAll}
            disabled={triggering}
            style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#4f46e5', color: 'white', fontWeight: 'bold', cursor: triggering ? 'not-allowed' : 'pointer', opacity: triggering ? 0.6 : 1, fontSize: '14px' }}
          >
            {triggering ? 'Starting…' : `Analyze ${notYetAnalyzed.length} Repo${notYetAnalyzed.length !== 1 ? 's' : ''}`}
          </button>
        )}
        {notYetAnalyzed.length === 0 && (
          <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 'bold' }}>✓ All repos analyzed</span>
        )}
      </div>

      {triggerError && <p style={{ color: 'red', fontSize: '14px', marginBottom: '12px' }}>{triggerError}</p>}

      {/* Repo list */}
      {importedRepos.map(repo => {
        const analysis  = analysisMap[repo.id]
        const isComplete = analysis?.status === 'completed'
        return (
          <div
            key={repo.id}
            onClick={isComplete ? () => setDetailRepo(repo) : undefined}
            style={{ padding: '14px 16px', border: '1px solid #e5e7eb', borderRadius: '10px', marginBottom: '10px', backgroundColor: 'white', cursor: isComplete ? 'pointer' : 'default', transition: 'box-shadow 0.15s' }}
            onMouseEnter={e => { if (isComplete) e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#111827' }}>{repo.name}</span>
                {isComplete && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#4f46e5' }}>View analysis →</span>}
                {repo.description && <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>{repo.description}</p>}
                <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '12px', color: '#9ca3af' }}>
                  {repo.primary_language && <span>{repo.primary_language}</span>}
                  <span>⭐ {repo.stars_count ?? 0}</span>
                </div>
              </div>
              <div style={{ marginLeft: '12px', flexShrink: 0 }}>
                {analysis ? statusBadge(analysis.status) : statusBadge('not_analyzed')}
              </div>
            </div>
            {analysis?.status === 'failed' && (
              <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#dc2626' }}>Analysis failed. Try again.</p>
            )}
          </div>
        )
      })}
    </>
  )
}

export default AnalysisPanel
