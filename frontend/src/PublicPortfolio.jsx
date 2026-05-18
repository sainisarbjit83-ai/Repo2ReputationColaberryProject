import { useState, useEffect, useRef } from 'react'
import { BASE_URL } from './api'

// ─── Tokens ───────────────────────────────────────────────────────────────────
const A = '#4361ee'          // accent blue
const AL = '#eef2ff'         // accent light
const T = '#0f172a'          // text primary
const TS = '#475569'         // text secondary
const TM = '#94a3b8'         // text muted
const BD = '#e2e8f0'         // border
const BG = '#f8fafc'         // page background

const CAT = {
  Frontend: { bg: '#ede9fe', text: '#5b21b6' },
  Backend:  { bg: '#dbeafe', text: '#1e40af' },
  Database: { bg: '#fef3c7', text: '#92400e' },
  DevOps:   { bg: '#dcfce7', text: '#166534' },
  Mobile:   { bg: '#fce7f3', text: '#9d174d' },
  AI:       { bg: '#f3e8ff', text: '#6b21a8' },
  Testing:  { bg: '#ecfdf5', text: '#065f46' },
  Other:    { bg: '#f1f5f9', text: '#334155' },
}
const cat = c => CAT[c] || CAT.Other

const GRADIENTS = [
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#fa709a,#fee140)',
  'linear-gradient(135deg,#a18cd1,#fbc2eb)',
]
const gradient = name => GRADIENTS[(name?.charCodeAt(0) || 0) % GRADIENTS.length]

function groupByCategory(skills) {
  return skills.reduce((acc, s) => {
    const k = s.category || 'Other'
    ;(acc[k] = acc[k] || []).push(s)
    return acc
  }, {})
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ title, headline, narrative, topSkills, githubUsername }) {
  const grouped  = groupByCategory(topSkills)
  const initials = (title || 'D').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  const insights = (narrative || '')
    .split('.')
    .map(s => s.trim())
    .filter(s => s.length > 30)
    .slice(0, 3)
    .map(s => s + '.')

  return (
    <aside style={{
      width: '230px', flexShrink: 0,
      backgroundColor: BG,
      borderRight: `1px solid ${BD}`,
      padding: '18px 14px',
      display: 'flex', flexDirection: 'column', gap: '18px',
      overflowY: 'auto',
    }}>
      {/* Avatar + identity */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '84px', height: '84px', borderRadius: '50%',
          background: 'linear-gradient(135deg,#4361ee,#7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: '800', fontSize: '26px',
          margin: '0 auto 14px',
          boxShadow: '0 4px 18px rgba(67,97,238,0.28)',
        }}>{initials}</div>

        <h2 style={{ margin: '0 0 5px', fontSize: '19px', fontWeight: '800', color: T, lineHeight: 1.2 }}>
          {title}
        </h2>
        {headline && (
          <p style={{ margin: '0 0 10px', fontSize: '12px', color: A, fontWeight: '600', lineHeight: 1.5 }}>
            {headline}
          </p>
        )}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: '3px 10px', borderRadius: '20px',
          backgroundColor: '#dcfce7', fontSize: '11px', fontWeight: '600', color: '#166534',
        }}>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'inline-block' }} />
          Available for opportunities
        </span>
      </div>

      {/* GitHub link */}
      {githubUsername && (
        <div>
          <Label>Contact</Label>
          <Row icon="🔗">
            <a href={`https://github.com/${githubUsername}`} target="_blank" rel="noreferrer"
              style={{ color: A, fontSize: '12px', textDecoration: 'none', fontWeight: '500' }}>
              github.com/{githubUsername}
            </a>
          </Row>
        </div>
      )}

      {/* Skills */}
      {Object.keys(grouped).length > 0 && (
        <div id="skills">
          <Label>Skills</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(grouped).map(([c, skills]) => {
              const s = cat(c)
              return (
                <div key={c}>
                  <p style={{ margin: '0 0 5px', fontSize: '11px', fontWeight: '700', color: TS }}>{c}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {skills.map((sk, i) => (
                      <span key={i} style={{
                        padding: '2px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: '600',
                        backgroundColor: s.bg, color: s.text,
                      }}>{sk.name}</span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* AI Insights */}
      {insights.length > 0 && (
        <div>
          <Label icon="🤖">AI Insights</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {insights.map((ins, i) => (
              <div key={i} style={{ display: 'flex', gap: '7px', alignItems: 'flex-start' }}>
                <span style={{ color: '#16a34a', fontSize: '11px', marginTop: '2px', flexShrink: 0 }}>●</span>
                <p style={{ margin: 0, fontSize: '11px', color: TS, lineHeight: 1.65 }}>{ins}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}

function Label({ children, icon }) {
  return (
    <h3 style={{
      margin: '0 0 10px', fontSize: '10px', fontWeight: '700', color: T,
      textTransform: 'uppercase', letterSpacing: '1.5px',
      display: 'flex', alignItems: 'center', gap: '5px',
    }}>
      {icon && <span>{icon}</span>}{children}
    </h3>
  )
}

function Row({ icon, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px' }}>
      <span style={{ fontSize: '12px', flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: '12px', color: TS }}>{children}</span>
    </div>
  )
}

// ─── Top Nav ──────────────────────────────────────────────────────────────────
const TABS = ['Overview', 'Projects', 'Experience', 'Skills']

function TopNav({ active, onTab }) {
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      backgroundColor: '#fff',
      borderBottom: `1px solid ${BD}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 28px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '13px 0', flexShrink: 0 }}>
        <div style={{
          width: '26px', height: '26px', borderRadius: '6px',
          background: 'linear-gradient(135deg,#4361ee,#7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: '800', fontSize: '11px',
        }}>R</div>
        <span style={{ fontWeight: '700', fontSize: '13px', color: T }}>
          Repo2<span style={{ color: A }}>Reputation</span>
        </span>
      </div>

      {/* Recruiter search link */}
      <a
        href="/search"
        style={{
          fontSize: '12px', fontWeight: '600', color: A,
          textDecoration: 'none', padding: '5px 12px',
          border: `1px solid ${BD}`, borderRadius: '7px',
          backgroundColor: '#fff',
        }}
      >
        Find more talent →
      </a>

      {/* Tabs */}
      <div style={{ display: 'flex' }}>
        {TABS.map(tab => {
          const id = tab.toLowerCase()
          const on = active === id
          return (
            <a key={tab} href={`#${id}`} onClick={() => onTab(id)}
              style={{
                padding: '14px 13px', fontSize: '13px', fontWeight: on ? '700' : '500',
                color: on ? A : TS,
                borderBottom: on ? `2px solid ${A}` : '2px solid transparent',
                textDecoration: 'none', transition: 'all 0.15s',
              }}>
              {tab}
            </a>
          )
        })}
      </div>

      {/* CTA */}
      <button
        onClick={() => window.print()}
        style={{
          padding: '7px 14px', backgroundColor: A, color: '#fff',
          border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: '600',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
        }}>
        Download Resume ↓
      </button>
    </nav>
  )
}

// ─── Summary with Show more ───────────────────────────────────────────────────
function SummaryText({ text }) {
  const [expanded, setExpanded] = useState(false)
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  const short     = sentences.slice(0, 2).join(' ').trim()
  const isTruncated = sentences.length > 2

  return (
    <p style={{ margin: '0 0 14px', fontSize: '13px', color: TS, lineHeight: 1.7 }}>
      {expanded ? text : short}
      {isTruncated && (
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ marginLeft: '6px', background: 'none', border: 'none', color: A, fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: 0 }}>
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </p>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ id, icon, title, children, right }) {
  return (
    <section id={id} style={{ marginBottom: '20px' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingBottom: '7px', marginBottom: '12px', borderBottom: `1px solid ${BD}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <span style={{ fontSize: '16px' }}>{icon}</span>
          <h2 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: T, textTransform: 'uppercase', letterSpacing: '2px' }}>
            {title}
          </h2>
        </div>
        {right}
      </div>
      {children}
    </section>
  )
}

function ConfidenceBadge({ score }) {
  if (score == null) return null
  const pct = Math.round(score * 100)
  const { bg, text, label } =
    pct >= 80 ? { bg: '#dcfce7', text: '#166534', label: 'High' } :
    pct >= 50 ? { bg: '#fef3c7', text: '#92400e', label: 'Medium' } :
                { bg: '#f1f5f9', text: '#475569', label: 'Low' }
  return (
    <span style={{
      padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '700',
      backgroundColor: bg, color: text, flexShrink: 0,
    }}>
      🤖 AI {label} · {pct}%
    </span>
  )
}

// ─── Project card ─────────────────────────────────────────────────────────────
function ProjectCard({ repo, featured }) {
  const [hov, setHov] = useState(false)
  const techs  = (repo.analysis?.technologies || []).slice(0, 6)
  const topics = Array.isArray(repo.topics) ? repo.topics : (repo.topics ? JSON.parse(repo.topics) : [])
  const tags   = [...techs.map(t => t.name), ...topics].slice(0, 7)
  const desc   = repo.analysis?.whatItDoes || repo.description || ''

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', gap: '14px',
        padding: '10px 12px', marginBottom: '8px',
        border: `1px solid ${hov ? '#a5b4fc' : BD}`,
        borderRadius: '12px', backgroundColor: '#fff',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: hov ? '0 4px 16px rgba(67,97,238,0.1)' : '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {/* Thumbnail */}
      <div style={{
        width: '120px', height: '72px', borderRadius: '8px', flexShrink: 0,
        background: gradient(repo.name),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', position: 'relative',
      }}>
        {repo.gifUrl ? (
          <img
            src={repo.gifUrl}
            alt={repo.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={e => { e.target.style.display = 'none' }}
          />
        ) : (
          <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: '600', textAlign: 'center', padding: '0 8px' }}>
            {repo.name?.slice(0, 16)}
          </span>
        )}
      </div>

      {/* Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: T }}>{formatRepoName(repo.name)}</h3>
          {featured && (
            <span style={{ padding: '2px 9px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', backgroundColor: '#dbeafe', color: '#1d4ed8' }}>
              Featured
            </span>
          )}
        </div>

        {desc && (
          <p style={{ margin: '0 0 7px', fontSize: '11px', color: TS, lineHeight: 1.5,
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {desc}
          </p>
        )}

        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '7px' }}>
            {tags.slice(0, 4).map((tag, i) => (
              <span key={i} style={{
                padding: '1px 7px', borderRadius: '5px', fontSize: '10px', fontWeight: '600',
                backgroundColor: '#f1f5f9', color: '#334155', border: `1px solid ${BD}`,
              }}>{tag}</span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: TM }}>
            <span>☆ {repo.stars || 0}</span>
            <span>⑂ {repo.forks || 0}</span>
            {repo.language && <span>● {repo.language}</span>}
          </div>
          <ConfidenceBadge score={repo.analysis?.confidenceScore} />
        </div>
      </div>
    </div>
  )
}

// ─── Experience helpers ───────────────────────────────────────────────────────
function formatRepoName(name = '') {
  return name
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
}

function inferRoleTitle(repo) {
  const techs  = repo.analysis?.technologies || []
  // Normalise: strip punctuation/spaces so "Node.js" = "nodejs", "React.js" = "reactjs"
  const raw    = new Set(techs.map(t => t.name.toLowerCase()))
  const names  = new Set([...raw, ...[...raw].map(n => n.replace(/[\s.]/g, ''))])
  const desc   = (repo.analysis?.whatItDoes || repo.description || '').toLowerCase()
  const counts = techs.reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + 1; return acc }, {})
  const hasCat = c => (counts[c] || 0) > 0
  // has() checks exact tech names (with normalised aliases)
  const has    = (...ns) => ns.some(n => names.has(n.toLowerCase()) || names.has(n.toLowerCase().replace(/[\s.]/g, '')))
  const inDesc = (...ws) => ws.some(w => desc.includes(w))
  const top    = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]

  // ── 1. Specific AI / ML libraries ────────────────────────────────────────
  const aiLibs = [
    'tensorflow','pytorch','keras','scikit-learn','sklearn','huggingface',
    'langchain','openai','llama','bert','transformers','spacy','nltk',
    'stable-diffusion','anthropic','llamaindex','chromadb','ollama',
  ]
  if (aiLibs.some(l => names.has(l) || desc.includes(l))) {
    return hasCat('Frontend') || hasCat('Backend') ? 'AI Application Developer' : 'AI / ML Engineer'
  }

  // ── 2. AI category or strong AI keywords in description ──────────────────
  if (hasCat('AI') || inDesc('openai','llm','machine learning','neural network','nlp','gpt','generative ai')) {
    return hasCat('Frontend') || hasCat('Backend') ? 'AI Application Developer' : 'AI Engineer'
  }

  // ── 3. BI-specific tools ──────────────────────────────────────────────────
  const biTools = ['power bi','powerbi','tableau','looker','metabase','superset','dax','ssrs','ssas','qlik','grafana']
  if (biTools.some(t => names.has(t) || names.has(t.replace(/\s/g,'')) || desc.includes(t))) {
    return 'Business Intelligence Developer'
  }

  // ── 4. Python/R + data libraries → Data Scientist / Analyst ─────────────
  // Bug fix: was hasCat('Backend') which matched any Node/Express project
  const dataLibs = ['pandas','numpy','matplotlib','seaborn','plotly','scipy','streamlit','dash','jupyter','sklearn','polars']
  if (has('python','r','julia') && dataLibs.some(l => names.has(l))) {
    return inDesc('machine learning','predict','model','classif','cluster','regression','neural') ? 'Data Scientist' : 'Data Analyst'
  }

  // ── 5. SQL engine + analytics description → BI Developer ─────────────────
  const sqlEngines = ['sql','postgresql','postgres','mysql','mssql','sqlite','bigquery','redshift','snowflake','dbt']
  if (sqlEngines.some(s => names.has(s)) && inDesc('report','dashboard','analyt','visuali','insight','kpi','metric','warehouse')) {
    return 'BI Developer'
  }

  // ── 6. Frontend framework + backend framework → Full Stack ────────────────
  // Aliases cover common variations (node / nodejs / node.js, react / reactjs / react.js)
  const feFw = ['react','reactjs','vue','vuejs','angular','svelte','nextjs','nuxt','remix','astro','qwik']
  const beFw = ['node','nodejs','express','expressjs','django','flask','fastapi','spring','rails','laravel','nestjs','koa','hapi','gin','fiber','actix','axum','phoenix']
  const isFE = feFw.some(f => names.has(f))
  const isBE = beFw.some(b => names.has(b))
  if (isFE && isBE) return 'Full Stack Developer'

  // ── 7. Mobile frameworks ──────────────────────────────────────────────────
  if (has('react native','reactnative','flutter','expo','swift','kotlin','ionic','xamarin') || hasCat('Mobile')) {
    return 'Mobile Developer'
  }

  // ── 8. DevOps / cloud tools → Platform Engineer ──────────────────────────
  const devops = ['docker','kubernetes','k8s','terraform','ansible','jenkins','circleci','aws','gcp','azure','helm','pulumi','argocd']
  if (devops.some(d => names.has(d)) || top === 'DevOps') return 'Platform Engineer'

  // ── 9. Backend-only ───────────────────────────────────────────────────────
  if (isBE || (hasCat('Backend') && !hasCat('Frontend'))) return 'Backend Developer'

  // ── 10. Frontend-only ────────────────────────────────────────────────────
  if (isFE || (hasCat('Frontend') && !hasCat('Backend'))) return 'Frontend Developer'

  // ── 11. Category-level fallbacks ─────────────────────────────────────────
  if (hasCat('Frontend') && hasCat('Backend')) return 'Full Stack Developer'
  if (top === 'Database') return 'Data Engineer'
  return 'Software Engineer'
}

function buildImpactStatement(repo) {
  const what  = (repo.analysis?.whatItDoes || repo.description || '').trim()
  const techs = (repo.analysis?.technologies || []).slice(0, 3).map(t => t.name)
  const techStr = techs.length ? ` using ${techs.join(', ')}` : ''

  if (!what) return techs.length ? `Developed a solution${techStr}.` : null

  const verbs = ['Built', 'Developed', 'Engineered', 'Designed', 'Created']
  const verb  = verbs[what.charCodeAt(0) % verbs.length]

  // If what already opens with a past-tense verb, keep it
  if (/^(Built|Developed|Implemented|Created|Designed|Engineered|Architected|Analyzed|Automated)/i.test(what)) {
    const base = what.replace(/\.?$/, '')
    return techStr ? `${base}${techStr}.` : `${base}.`
  }

  // Strip leading article so we don't get "Built A TypeScript project…"
  const body = what.replace(/^(A |An |The )/i, '').replace(/\.?$/, '')
  return `${verb} ${body.charAt(0).toLowerCase()}${body.slice(1)}${techStr}.`
}

// ─── Experience timeline ──────────────────────────────────────────────────────
function Timeline({ repos }) {
  return (
    <div style={{ position: 'relative', paddingLeft: '20px' }}>
      <div style={{ position: 'absolute', left: '5px', top: 0, bottom: 0, width: '2px', backgroundColor: BD }} />

      {repos.map((repo, i) => {
        const roleTitle  = inferRoleTitle(repo)
        const displayName = formatRepoName(repo.name)
        const impact     = buildImpactStatement(repo)
        const techChips  = (repo.analysis?.technologies || []).slice(0, 5).map(t => t.name)

        return (
          <div key={i} style={{ display: 'flex', gap: '18px', marginBottom: '16px', position: 'relative' }}>
            {/* Dot */}
            <div style={{
              position: 'absolute', left: '-18px', top: '5px',
              width: '10px', height: '10px', borderRadius: '50%',
              backgroundColor: A, border: '2px solid #fff',
              boxShadow: `0 0 0 2px ${A}`, flexShrink: 0,
            }} />

            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '700', color: T, letterSpacing: '-0.2px' }}>
                {roleTitle}
              </h4>
              <p style={{ margin: '0 0 6px', fontSize: '12px', color: A, fontWeight: '600' }}>
                {displayName}
              </p>
              {impact && (
                <p style={{ margin: '0 0 7px', fontSize: '12px', color: TS, lineHeight: 1.65 }}>
                  {impact}
                </p>
              )}
              {techChips.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {techChips.map((t, j) => (
                    <span key={j} style={{
                      padding: '1px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: '600',
                      backgroundColor: '#f1f5f9', color: '#334155', border: `1px solid ${BD}`,
                    }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PublicPortfolio({ slug }) {
  const [portfolio, setPortfolio] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [notFound, setNotFound]   = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const mainRef = useRef(null)

  useEffect(() => {
    fetch(`${BASE_URL}/api/portfolios/public/${slug}`)
      .then(res => {
        if (res.status === 404) { setNotFound(true); setLoading(false); return null }
        return res.json()
      })
      .then(json => {
        if (!json) return
        if (json.success) setPortfolio(json.data)
        else setNotFound(true)
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [slug])

  // Sync active tab on scroll
  useEffect(() => {
    const ids = ['overview', 'projects', 'experience', 'skills']
    const obs = new IntersectionObserver(
      entries => {
        entries.forEach(e => { if (e.isIntersecting) setActiveTab(e.target.id) })
      },
      { rootMargin: '-40% 0px -55% 0px' }
    )
    ids.forEach(id => { const el = document.getElementById(id); if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [portfolio])

  if (loading) return (
    <div style={{ minHeight: '100vh', backgroundColor: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: TM, fontSize: '14px' }}>Loading portfolio…</p>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', backgroundColor: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
      <p style={{ fontSize: '56px', fontWeight: '800', color: BD, margin: 0, lineHeight: 1 }}>404</p>
      <p style={{ fontSize: '17px', fontWeight: '700', color: T, margin: 0 }}>Portfolio not found</p>
      <p style={{ fontSize: '13px', color: TS, margin: 0 }}>This portfolio may be private or the link may be incorrect.</p>
    </div>
  )

  const { title, headline, narrative, topSkills = [], repos = [], projects = [], publishedAt } = portfolio

  // Derive GitHub username from any repo fullName (e.g. "username/reponame")
  const githubUsername = repos.find(r => r.fullName)?.fullName?.split('/')?.[0] || null
  const yearsActive    = Math.max(1, new Date().getFullYear() - 2022)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: BG, fontFamily: "'Inter', system-ui, sans-serif", color: T }}>

      <style>{`
        @media print {
          nav, aside { display: none !important; }
          #main-content { padding: 0 !important; }
        }
        a:hover { opacity: 0.8; }
      `}</style>

      <TopNav active={activeTab} onTab={setActiveTab} />

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 48px)' }}>

        <Sidebar
          title={title}
          headline={headline}
          narrative={narrative}
          topSkills={topSkills}
          githubUsername={githubUsername}
        />

        {/* Main content */}
        <main id="main-content" ref={mainRef} style={{ flex: 1, padding: '20px 28px 32px', minWidth: 0, overflowY: 'auto' }}>

          {/* ── Overview ───────────────────────────────────────────── */}
          <Section id="overview" icon="👤" title="Professional Summary">
            <SummaryText text={narrative || 'No summary available.'} />

            {/* Stats row */}
            <div style={{
              display: 'flex',
              border: `1px solid ${BD}`, borderRadius: '10px',
              overflow: 'hidden', backgroundColor: '#fff',
            }}>
              {[
                { value: `${yearsActive}+`,      label: 'Years Active',  icon: '📅' },
                { value: `${repos.length}`,       label: 'Repositories',  icon: '📁' },
                { value: `${topSkills.length}+`,  label: 'Technologies',  icon: '⚙️' },
                { value: `${projects.length || repos.length}`, label: 'Projects', icon: '🚀' },
              ].map((s, i, arr) => (
                <div key={i} style={{
                  flex: 1, padding: '11px 8px', textAlign: 'center',
                  borderRight: i < arr.length - 1 ? `1px solid ${BD}` : 'none',
                }}>
                  <div style={{ fontSize: '13px', marginBottom: '2px' }}>{s.icon}</div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: T, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: '9px', color: TS, marginTop: '3px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* ── What I Built (projects quick-list) ─────────────────── */}
          {projects.length > 0 && (
            <Section id="projects" icon="🚀" title="What I Built">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px', marginBottom: '8px' }}>
                {projects.map((p, i) => (
                  <div key={i} style={{
                    padding: '12px 14px',
                    border: `1px solid ${BD}`, borderRadius: '10px',
                    backgroundColor: '#fff',
                    display: 'flex', gap: '10px', alignItems: 'flex-start',
                  }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0,
                      background: gradient(p.repoName),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', color: 'rgba(255,255,255,0.8)', fontWeight: '700',
                    }}>
                      {(p.repoName || '?')[0]}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: '0 0 2px', fontSize: '12px', fontWeight: '700', color: T, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {formatRepoName(p.repoName)}
                      </p>
                      {p.oneLiner && (
                        <p style={{ margin: 0, fontSize: '11px', color: TS, lineHeight: 1.5 }}>
                          {p.oneLiner}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── Featured Projects (detailed cards) ─────────────────── */}
          {repos.length > 0 && (
            <Section icon="📁" title="Featured Projects">
              {repos.map((repo, i) => (
                <ProjectCard key={i} repo={repo} featured={i < 2} />
              ))}
            </Section>
          )}

          {/* ── Experience ─────────────────────────────────────────── */}
          {repos.length > 0 && (
            <Section id="experience" icon="💼" title="Experience">
              <Timeline repos={repos} />
            </Section>
          )}

          {/* ── Let's Connect ──────────────────────────────────────── */}
          {githubUsername && (
            <div style={{
              padding: '20px 24px',
              border: `1px solid ${BD}`, borderRadius: '12px',
              backgroundColor: '#fff',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexWrap: 'wrap', gap: '14px',
              marginBottom: '28px',
            }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '700', color: T }}>Let's Connect</h3>
                <p style={{ margin: 0, fontSize: '12px', color: TS }}>Open to exciting opportunities and collaborations.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <a href={`https://github.com/${githubUsername}`} target="_blank" rel="noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                    border: `1px solid ${BD}`, color: T, backgroundColor: '#fff', textDecoration: 'none',
                  }}>
                  🐙 GitHub
                </a>
              </div>
            </div>
          )}

          {/* ── Footer ─────────────────────────────────────────────── */}
          <div style={{ borderTop: `1px solid ${BD}`, paddingTop: '16px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '11px', color: TM }}>
              © {new Date().getFullYear()}
              {publishedAt ? ` · Published ${new Date(publishedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : ''}
              {' · Built with '}
              <span style={{ color: A, fontWeight: '700' }}>Repo2Reputation</span>
            </p>
          </div>

        </main>
      </div>
    </div>
  )
}
