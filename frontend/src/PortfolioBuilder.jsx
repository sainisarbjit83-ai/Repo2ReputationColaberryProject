import { useState, useEffect, useRef } from 'react'
import { authFetch, BASE_URL } from './api'

const POLL_MS = 3000

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

function techChipStyle(category) {
  return TECH_CATEGORY_COLORS[category] || TECH_CATEGORY_COLORS.Other
}

function SectionCard({ title, children }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '18px 20px', marginBottom: '14px', backgroundColor: 'white' }}>
      <p style={{ margin: '0 0 12px', fontWeight: 'bold', fontSize: '14px', color: '#111827' }}>{title}</p>
      {children}
    </div>
  )
}

function PortfolioBuilder({ onLogout }) {
  // Data loading
  const [importedRepos, setImportedRepos] = useState([])
  const [analysisMap, setAnalysisMap]     = useState({})
  const [loading, setLoading]             = useState(true)

  // Step 1 — form
  const [title, setTitle]       = useState('')
  const [selected, setSelected] = useState(new Set())
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)

  // Step 2 — portfolio + narrative generation
  const [portfolio, setPortfolio]           = useState(null)
  const [generating, setGenerating]         = useState(false)
  const [narrativeStatus, setNarrativeStatus] = useState(null)
  const [narrativeData, setNarrativeData]   = useState(null)
  const [generateError, setGenerateError]   = useState(null)
  const pollRef = useRef(null)

  // Step 3 — media (GIF URLs)
  const [repoMedia, setRepoMedia]       = useState({})
  const [savingMedia, setSavingMedia]   = useState(false)
  const [mediaSaved, setMediaSaved]     = useState(false)

  // Step 4 — publish
  const [publishing, setPublishing] = useState(false)
  const [publicUrl, setPublicUrl]   = useState(null)
  const [publishError, setPublishError] = useState(null)
  const [copied, setCopied]         = useState(false)

  useEffect(() => {
    loadRepos()
  }, [])

  // Stop polling when component unmounts
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  async function loadRepos() {
    const res = await authFetch(`${BASE_URL}/api/repos/imported`, {}, onLogout)
    if (!res) return
    const json = await res.json()
    const repos = json.data || []
    setImportedRepos(repos)

    await Promise.all(repos.map(async repo => {
      const aRes = await authFetch(`${BASE_URL}/api/analysis/repo/${repo.id}`, {}, onLogout)
      if (!aRes) return
      const aJson = await aRes.json()
      if (aJson?.success) {
        setAnalysisMap(prev => ({ ...prev, [repo.id]: aJson.data }))
      }
    }))

    setLoading(false)
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleCreate() {
    if (!title.trim() || selected.size === 0 || creating) return
    setCreating(true)
    setCreateError(null)

    const res = await authFetch(`${BASE_URL}/api/portfolios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), repositoryIds: [...selected] }),
    }, onLogout)

    if (!res) { setCreating(false); return }

    const json = await res.json()
    setCreating(false)

    if (json.success) {
      setPortfolio(json.data)
    } else {
      setCreateError(json.error?.message || 'Failed to create portfolio.')
    }
  }

  async function handleGenerateNarrative() {
    if (!portfolio || generating) return
    setGenerating(true)
    setGenerateError(null)

    let res
    try {
      res = await authFetch(
        `${BASE_URL}/api/portfolios/${portfolio.portfolioId}/generate-narrative`,
        { method: 'POST' },
        onLogout
      )
    } catch (err) {
      setGenerateError('Network error — is the backend running?')
      setGenerating(false)
      return
    }

    if (!res) { setGenerating(false); return }

    const json = await res.json()
    if (!json.success) {
      setGenerateError(json.error?.message || 'Failed to start narrative generation.')
      setGenerating(false)
      return
    }

    setNarrativeStatus('generating')

    // Poll until complete
    pollRef.current = setInterval(async () => {
      const pRes = await authFetch(`${BASE_URL}/api/portfolios/${portfolio.portfolioId}`, {}, onLogout)
      if (!pRes) return
      const pJson = await pRes.json()
      if (!pJson.success) return

      const status = pJson.data.narrativeStatus
      setNarrativeStatus(status)

      if (status === 'completed') {
        clearInterval(pollRef.current)
        pollRef.current = null
        setGenerating(false)
        setNarrativeData(pJson.data.narrative)
      } else if (status === 'failed') {
        clearInterval(pollRef.current)
        pollRef.current = null
        setGenerating(false)
        setGenerateError('Narrative generation failed. Please try again.')
      }
    }, POLL_MS)
  }

  async function handlePublish() {
    if (!portfolio || publishing) return
    setPublishing(true)
    setPublishError(null)

    const res = await authFetch(
      `${BASE_URL}/api/portfolios/${portfolio.portfolioId}/publish`,
      { method: 'PATCH' },
      onLogout
    )

    if (!res) { setPublishing(false); return }

    const json = await res.json()
    setPublishing(false)

    if (json.success) {
      setPublicUrl(json.data.publicUrl)
    } else {
      setPublishError(json.error?.message || 'Failed to publish portfolio.')
    }
  }

  async function handleSaveMedia() {
    if (!portfolio || savingMedia) return
    setSavingMedia(true)
    setMediaSaved(false)
    const res = await authFetch(
      `${BASE_URL}/api/portfolios/${portfolio.portfolioId}/media`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoMedia }),
      },
      onLogout
    )
    setSavingMedia(false)
    if (res?.ok) setMediaSaved(true)
  }

  function handleCopy() {
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const analyzedRepos = importedRepos.filter(r => analysisMap[r.id]?.status === 'completed')

  // ── Step 4: Published ──────────────────────────────────────────────────────
  if (publicUrl) {
    return (
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '8px 0' }}>
        <div style={{ padding: '20px 24px', backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', marginBottom: '20px' }}>
          <p style={{ margin: '0 0 4px', fontWeight: 'bold', fontSize: '16px', color: '#166534' }}>✓ Portfolio is live!</p>
          <p style={{ margin: 0, fontSize: '13px', color: '#166534' }}>Your portfolio is now public and shareable.</p>
        </div>

        <SectionCard title="Public URL">
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              readOnly
              value={publicUrl}
              style={{ flex: 1, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', color: '#374151', backgroundColor: '#f9fafb' }}
            />
            <button
              onClick={handleCopy}
              style={{
                padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold',
                backgroundColor: copied ? '#dcfce7' : '#4f46e5', color: copied ? '#166534' : 'white', transition: 'all 0.15s',
              }}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </SectionCard>

        <button
          onClick={() => { setPortfolio(null); setNarrativeData(null); setNarrativeStatus(null); setPublicUrl(null); setTitle(''); setSelected(new Set()) }}
          style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', padding: 0 }}
        >
          + Build another portfolio
        </button>
      </div>
    )
  }

  // ── Step 3: Narrative preview + publish ────────────────────────────────────
  if (narrativeStatus === 'completed' && narrativeData) {
    return (
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '8px 0' }}>
        <div style={{ padding: '10px 16px', backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', color: '#166534', fontWeight: 'bold' }}>
          ✓ Narrative ready — review and publish
        </div>

        {narrativeData.headline && (
          <div style={{ marginBottom: '18px' }}>
            <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Headline</p>
            <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#111827', lineHeight: '1.4' }}>{narrativeData.headline}</p>
          </div>
        )}

        {narrativeData.narrative && (
          <SectionCard title="Professional Narrative">
            <p style={{ margin: 0, fontSize: '14px', color: '#374151', lineHeight: '1.7', whiteSpace: 'pre-line' }}>{narrativeData.narrative}</p>
          </SectionCard>
        )}

        {narrativeData.top_skills?.length > 0 && (
          <SectionCard title="Top Skills">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {narrativeData.top_skills.map((skill, i) => {
                const s = techChipStyle(skill.category)
                return (
                  <span key={i} style={{
                    padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold',
                    backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}`,
                  }}>
                    {skill.name}
                    <span style={{ fontWeight: 'normal', opacity: 0.75, marginLeft: '4px', fontSize: '11px' }}>
                      {Math.round((skill.confidence || 0) * 100)}%
                    </span>
                  </span>
                )
              })}
            </div>
          </SectionCard>
        )}

        {narrativeData.projects?.length > 0 && (
          <SectionCard title="Projects">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {narrativeData.projects.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', fontSize: '14px' }}>
                  <span style={{ flexShrink: 0, fontWeight: 'bold', color: '#374151' }}>{p.repoName}</span>
                  <span style={{ color: '#6b7280' }}>{p.oneLiner}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* GIF / image URLs per repo */}
        <SectionCard title="Add Project GIFs (optional)">
          <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#6b7280', lineHeight: 1.6 }}>
            Paste a GIF or image URL for each project. This will replace the gradient placeholder on your public portfolio.
            Host your GIFs on Giphy, Imgur, or any CDN.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[...selected].map(repoId => {
              const repo = importedRepos.find(r => r.id === repoId)
              if (!repo) return null
              return (
                <div key={repoId}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '5px' }}>
                    {repo.name}
                  </label>
                  <input
                    type="url"
                    placeholder="https://media.giphy.com/... or https://i.imgur.com/..."
                    value={repoMedia[repoId]?.gifUrl || ''}
                    onChange={e => setRepoMedia(prev => ({
                      ...prev,
                      [repoId]: { gifUrl: e.target.value.trim() },
                    }))}
                    style={{
                      width: '100%', padding: '8px 12px', boxSizing: 'border-box',
                      border: '1px solid #d1d5db', borderRadius: '7px',
                      fontSize: '13px', color: '#111827', outline: 'none',
                    }}
                  />
                  {repoMedia[repoId]?.gifUrl && (
                    <img
                      src={repoMedia[repoId].gifUrl}
                      alt="preview"
                      style={{ marginTop: '8px', width: '100%', maxHeight: '140px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                      onError={e => { e.target.style.display = 'none' }}
                    />
                  )}
                </div>
              )
            })}
          </div>
          <button
            onClick={handleSaveMedia}
            disabled={savingMedia}
            style={{
              marginTop: '14px', padding: '8px 20px', borderRadius: '8px', border: 'none',
              backgroundColor: mediaSaved ? '#dcfce7' : '#f3f4f6',
              color: mediaSaved ? '#166534' : '#374151',
              fontWeight: '600', fontSize: '13px', cursor: savingMedia ? 'not-allowed' : 'pointer',
            }}
          >
            {savingMedia ? 'Saving…' : mediaSaved ? '✓ Saved' : 'Save Media'}
          </button>
        </SectionCard>

        {publishError && (
          <p style={{ color: '#dc2626', fontSize: '14px', marginBottom: '12px' }}>{publishError}</p>
        )}

        <button
          onClick={handlePublish}
          disabled={publishing}
          style={{
            width: '100%', padding: '12px', borderRadius: '10px', border: 'none', cursor: publishing ? 'not-allowed' : 'pointer',
            backgroundColor: publishing ? '#a5b4fc' : '#4f46e5', color: 'white',
            fontWeight: 'bold', fontSize: '15px', transition: 'background-color 0.15s',
          }}
        >
          {publishing ? 'Publishing…' : 'Publish Portfolio'}
        </button>
      </div>
    )
  }

  // ── Step 2: Portfolio created — generate narrative ─────────────────────────
  if (portfolio) {
    return (
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '8px 0' }}>
        <div style={{ padding: '10px 16px', backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', color: '#166534', fontWeight: 'bold' }}>
          ✓ Portfolio "{portfolio.title}" created
        </div>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '24px', backgroundColor: 'white', textAlign: 'center' }}>
          {narrativeStatus === 'generating' ? (
            <>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>⏳</div>
              <p style={{ margin: '0 0 6px', fontWeight: 'bold', fontSize: '15px', color: '#111827' }}>Generating narrative…</p>
              <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>This takes about 10–20 seconds. Hang tight.</p>
            </>
          ) : (
            <>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>✦</div>
              <p style={{ margin: '0 0 6px', fontWeight: 'bold', fontSize: '15px', color: '#111827' }}>Ready to generate your narrative</p>
              <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#6b7280' }}>
                Our AI will write a recruiter-facing professional summary based on your {portfolio.repositoryIds?.length || selected.size} selected {portfolio.repositoryIds?.length === 1 ? 'repo' : 'repos'}.
              </p>
              {generateError && <p style={{ color: '#dc2626', fontSize: '14px', marginBottom: '12px' }}>{generateError}</p>}
              <button
                onClick={handleGenerateNarrative}
                disabled={generating}
                style={{
                  padding: '11px 28px', borderRadius: '10px', border: 'none',
                  cursor: generating ? 'not-allowed' : 'pointer',
                  backgroundColor: generating ? '#a5b4fc' : '#4f46e5',
                  color: 'white', fontWeight: 'bold', fontSize: '14px', transition: 'background-color 0.15s',
                }}
              >
                {generating ? 'Starting…' : 'Generate AI Narrative'}
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Step 1: Repo selection ─────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '8px 0' }}>

      {loading ? (
        <p style={{ color: '#6b7280', fontSize: '14px' }}>Loading repositories…</p>
      ) : analyzedRepos.length === 0 ? (
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          No analyzed repositories yet. Go to the Imported Repos tab and run analysis first.
        </p>
      ) : (
        <>
          {/* Title input */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#374151', marginBottom: '6px' }}>
              Portfolio Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Full-Stack Developer Portfolio"
              style={{
                width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px',
                fontSize: '14px', color: '#111827', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Repo checklist */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#374151', marginBottom: '10px' }}>
              Select Repositories ({selected.size} selected)
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {analyzedRepos.map(repo => {
                const isChecked = selected.has(repo.id)
                return (
                  <div
                    key={repo.id}
                    onClick={() => toggleSelect(repo.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px 14px', border: `1px solid ${isChecked ? '#818cf8' : '#e5e7eb'}`,
                      borderRadius: '10px', backgroundColor: isChecked ? '#eef2ff' : 'white',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelect(repo.id)}
                      onClick={e => e.stopPropagation()}
                      style={{ width: '16px', height: '16px', accentColor: '#4f46e5', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px', color: '#111827' }}>{repo.name}</p>
                      {repo.description && (
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {repo.description}
                        </p>
                      )}
                    </div>
                    <span style={{ flexShrink: 0, fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '10px', backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #86efac' }}>
                      ✓ Analyzed
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {createError && (
            <p style={{ color: '#dc2626', fontSize: '14px', marginBottom: '12px' }}>{createError}</p>
          )}

          <button
            onClick={handleCreate}
            disabled={creating}
            style={{
              width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
              backgroundColor: creating ? '#a5b4fc' : '#4f46e5',
              color: 'white', fontWeight: 'bold', fontSize: '15px',
              cursor: creating ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s',
            }}
          >
            {creating ? 'Creating…' : `Create Portfolio with ${selected.size} Repo${selected.size !== 1 ? 's' : ''}`}
          </button>
        </>
      )}
    </div>
  )
}

export default PortfolioBuilder
