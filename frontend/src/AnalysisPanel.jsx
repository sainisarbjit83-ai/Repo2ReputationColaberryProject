import { useState, useEffect, useRef } from 'react'
import { authFetch, BASE_URL } from './api'

const POLL_INTERVAL_MS = 3000

const badge = (status) => {
  const styles = {
    queued:    { backgroundColor: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' },
    running:   { backgroundColor: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd' },
    completed: { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #86efac' },
    failed:    { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' },
  }
  const labels = { queued: 'Queued', running: 'Analyzing…', completed: '✓ Analyzed', failed: '✗ Failed' }
  return (
    <span style={{ ...styles[status] || styles.failed, padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
      {labels[status] || status}
    </span>
  )
}

function SkillsList({ skills, domains, summary, confidence }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginTop: '8px' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '13px', padding: 0, fontWeight: 'bold' }}
      >
        {open ? '▲ Hide results' : '▼ View skills & summary'}
      </button>
      {open && (
        <div style={{ marginTop: '10px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          {summary && (
            <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#374151', fontStyle: 'italic' }}>{summary}</p>
          )}
          {skills?.length > 0 && (
            <>
              <p style={{ margin: '0 0 6px', fontWeight: 'bold', fontSize: '13px' }}>Skills detected</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                {skills.map((s, i) => (
                  <span key={i} title={s.evidence} style={{
                    padding: '3px 10px', borderRadius: '12px', fontSize: '12px',
                    backgroundColor: s.confidence >= 0.8 ? '#ede9fe' : '#f3f4f6',
                    color: s.confidence >= 0.8 ? '#5b21b6' : '#6b7280',
                    border: '1px solid ' + (s.confidence >= 0.8 ? '#c4b5fd' : '#d1d5db'),
                  }}>
                    {s.name} <span style={{ opacity: 0.7 }}>{Math.round(s.confidence * 100)}%</span>
                  </span>
                ))}
              </div>
            </>
          )}
          {domains?.length > 0 && (
            <>
              <p style={{ margin: '0 0 6px', fontWeight: 'bold', fontSize: '13px' }}>Domains</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {domains.map((d, i) => (
                  <span key={i} style={{
                    padding: '3px 10px', borderRadius: '12px', fontSize: '12px',
                    backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d',
                  }}>
                    {d.name}
                  </span>
                ))}
              </div>
            </>
          )}
          {confidence != null && (
            <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#9ca3af' }}>
              Overall confidence: {Math.round(confidence * 100)}%
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function AnalysisPanel({ importedRepos, onLogout }) {
  // analysisMap: { [repositoryId]: { analysisId, status, skills, domains, summary, confidenceScore } }
  const [analysisMap, setAnalysisMap]   = useState({})
  const [triggering, setTriggering]     = useState(false)
  const [triggerError, setTriggerError] = useState(null)
  const pollRef = useRef(null)

  // Load existing analyses for all imported repos on mount
  useEffect(() => {
    if (!importedRepos.length) return
    importedRepos.forEach(repo => loadRepoAnalysis(repo.id))
  }, [importedRepos])

  // Poll while any analysis is queued or running
  useEffect(() => {
    const hasActive = Object.values(analysisMap).some(
      a => a.status === 'queued' || a.status === 'running'
    )
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
        if (data?.success) {
          setAnalysisMap(prev => ({ ...prev, [repositoryId]: { ...data.data, repositoryId } }))
        }
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
            if (data?.success) {
              setAnalysisMap(prev => ({ ...prev, [a.repositoryId]: { ...data.data, repositoryId: a.repositoryId } }))
            }
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
            setAnalysisMap(prev => ({
              ...prev,
              [a.repositoryId]: { analysisId: a.analysisId, status: a.status, repositoryId: a.repositoryId },
            }))
          })
        } else {
          setTriggerError(data?.error?.message || 'Failed to start analysis.')
        }
        setTriggering(false)
      })
      .catch(() => { setTriggerError('Network error.'); setTriggering(false) })
  }

  const notYetAnalyzed = importedRepos.filter(r => {
    const a = analysisMap[r.id]
    return !a || (a.status !== 'completed' && a.status !== 'queued' && a.status !== 'running')
  })

  const anyActive = Object.values(analysisMap).some(
    a => a.status === 'queued' || a.status === 'running'
  )

  if (!importedRepos.length) {
    return <p style={{ color: '#6b7280' }}>No repos imported yet. Go to Browse and import repos first.</p>
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
            style={{
              padding: '9px 20px', borderRadius: '6px', border: 'none',
              backgroundColor: '#4f46e5', color: 'white', fontWeight: 'bold',
              cursor: triggering ? 'not-allowed' : 'pointer',
              opacity: triggering ? 0.6 : 1, fontSize: '14px',
            }}
          >
            {triggering ? 'Starting…' : `Analyze ${notYetAnalyzed.length} Repo${notYetAnalyzed.length !== 1 ? 's' : ''}`}
          </button>
        )}
        {notYetAnalyzed.length === 0 && (
          <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 'bold' }}>✓ All repos analyzed</span>
        )}
      </div>

      {triggerError && <p style={{ color: 'red', fontSize: '14px', marginBottom: '12px' }}>{triggerError}</p>}

      {/* Repo list with analysis status */}
      {importedRepos.map(repo => {
        const analysis = analysisMap[repo.id]
        return (
          <div key={repo.id} style={{ padding: '14px', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '10px', backgroundColor: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <a
                  href={`https://github.com/${repo.full_name}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ fontWeight: 'bold', fontSize: '15px', color: '#111827', textDecoration: 'none' }}
                >
                  {repo.name}
                </a>
                {repo.description && (
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>{repo.description}</p>
                )}
                <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '12px', color: '#9ca3af' }}>
                  {repo.primary_language && <span>{repo.primary_language}</span>}
                  <span>⭐ {repo.stars_count}</span>
                </div>
              </div>
              <div style={{ marginLeft: '12px', flexShrink: 0 }}>
                {analysis ? badge(analysis.status) : badge('not_analyzed')}
              </div>
            </div>

            {analysis?.status === 'completed' && (
              <SkillsList
                skills={analysis.skills}
                domains={analysis.domains}
                summary={analysis.summary}
                confidence={analysis.confidenceScore}
              />
            )}
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
