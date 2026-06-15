'use strict';

const puppeteer = require('puppeteer');

async function generatePortfolioPdf(data) {
  const html = buildResumeHtml(data);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: false,
      margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

// ─── Lookup tables ────────────────────────────────────────────────────────────

const TECH_CATEGORIES = {
  // Backend frameworks & auth
  express: 'Backend',   fastify: 'Backend',   nestjs: 'Backend',
  graphql: 'Backend',   trpc: 'Backend',      koa: 'Backend',
  hono: 'Backend',      django: 'Backend',    flask: 'Backend',
  fastapi: 'Backend',   rails: 'Backend',     spring: 'Backend',
  jwt: 'Backend',       passport: 'Backend',  'next-auth': 'Backend',
  'rest-routes': 'Backend',
  clerk: 'Backend',     'firebase-auth': 'Backend',
  // Frontend
  react: 'Frontend',    nextjs: 'Frontend',   vue: 'Frontend',
  angular: 'Frontend',  svelte: 'Frontend',   tailwind: 'Frontend',
  redux: 'Frontend',    zustand: 'Frontend',  jotai: 'Frontend',
  // Databases (raw storage only)
  postgresql: 'Databases', mysql: 'Databases',  mongodb: 'Databases',
  redis: 'Databases',      elasticsearch: 'Databases', dynamodb: 'Databases',
  sqlite: 'Databases',
  // ORM / data-access layers (separate from raw databases)
  prisma: 'ORM',  drizzle: 'ORM',   mongoose: 'ORM',
  sequelize: 'ORM', typeorm: 'ORM', knex: 'ORM',
  // AI/ML
  openai: 'AI/ML',      anthropic: 'AI/ML',  langchain: 'AI/ML',
  llamaindex: 'AI/ML',  'vercel-ai-sdk': 'AI/ML', pinecone: 'AI/ML',
  weaviate: 'AI/ML',    chromadb: 'AI/ML',   embeddings: 'AI/ML',
  mistral: 'AI/ML',     cohere: 'AI/ML',     groq: 'AI/ML',
  // DevOps
  docker: 'DevOps',     kubernetes: 'DevOps', 'github-actions': 'DevOps',
  terraform: 'DevOps',
  // Integrations
  stripe: 'Integrations',
};

const TECH_LABELS = {
  nextjs: 'Next.js',                'next-auth': 'NextAuth',
  'vercel-ai-sdk': 'Vercel AI SDK', 'github-actions': 'GitHub Actions',
  'firebase-auth': 'Firebase Auth', graphql: 'GraphQL',
  trpc: 'tRPC',                     postgresql: 'PostgreSQL',
  mongodb: 'MongoDB',               openai: 'OpenAI',
  langchain: 'LangChain',           llamaindex: 'LlamaIndex',
  chromadb: 'ChromaDB',             pinecone: 'Pinecone',
  weaviate: 'Weaviate',             nestjs: 'NestJS',
  tailwind: 'Tailwind CSS',         typeorm: 'TypeORM',
  dynamodb: 'DynamoDB',             elasticsearch: 'Elasticsearch',
  jwt: 'JWT',                       'rest-routes': 'REST Routing',
};

// Maps inference patternsInferred → human chip labels
const PATTERN_LABELS = {
  fullstack_architecture_confirmed:   'Full Stack Architecture',
  ai_orchestrated_system:             'AI/LLM Orchestration',
  ai_integration_confirmed:           'AI Integration',
  retrieval_augmented_architecture:   'RAG Pipeline',
  production_ready_backend:           'Production Backend',
  scalable_service_architecture:      'Scalable Services',
  enterprise_backend_patterns:        'Enterprise Backend',
  strong_domain_separation:           'Domain-Driven Design',
  modular_frontend_architecture:      'Modular Frontend',
  authentication_layer_present:       'Auth & Security',
  infrastructure_as_code_present:     'Infrastructure as Code',
};

// Maps code_intelligence architecturePatterns → recruiter-friendly labels
const CI_ARCH_LABELS = {
  rest_api:                'REST API Architecture',
  graphql_api:             'GraphQL API',
  type_safe_api:           'Type-Safe API',
  enterprise_rest_api:     'Enterprise REST API',
  stateless_auth:          'JWT Authentication',
  session_based_auth:      'Session Authentication',
  hosted_auth_provider:    'Hosted Auth Provider',
  strategy_based_auth:     'Strategy-Based Auth',
  provider_based_auth:     'OAuth Authentication',
  custom_auth_middleware:  'Custom Auth Middleware',
  orm:                     'Database Persistence Layer',
  query_builder:           'Programmatic Query Layer',
  document_database_odm:   'Document ODM',
  document_database:       'Document Database',
  relational_database:     'Relational Database',
  cache_store:             'Caching Layer',
  nosql_database:          'NoSQL Database',
  search_database:         'Full-Text Search',
  vector_database:         'Vector Database',
  vector_embeddings:       'Vector Embeddings',
  llm_integration:         'LLM Integration',
  llm_orchestration:       'LLM Orchestration',
  rag_framework:           'RAG Framework',
  component_ui:            'Component-Driven Frontend',
  ssr_framework:           'Server-Side Rendering (SSR)',
  global_state_management: 'Global State Management',
  utility_css_framework:   'Utility-First CSS',
  containerization:        'Containerized Deployment',
  container_orchestration: 'Container Orchestration',
  cicd_pipeline:           'Automated CI/CD Pipeline',
  infrastructure_as_code:  'Infrastructure Automation',
  payment_processing:      'Payment Integration',
  rest_routing:            'REST API Routing',
};

// Maps patternsInferred → target role string
const ROLE_MAP = {
  ai_orchestrated_system:           'AI Engineer',
  retrieval_augmented_architecture: 'AI Engineer',
  ai_integration_confirmed:         'Full Stack AI Engineer',
  fullstack_architecture_confirmed: 'Full Stack Engineer',
  production_ready_backend:         'Backend Engineer',
  enterprise_backend_patterns:      'Backend Engineer',
  modular_frontend_architecture:    'Frontend Engineer',
};

// Maps patternsInferred → career highlight label
const HIGHLIGHT_MAP = {
  ai_orchestrated_system:           'AI/LLM Orchestration',
  retrieval_augmented_architecture: 'Retrieval-Augmented Generation (RAG)',
  ai_integration_confirmed:         'AI/LLM Integration',
  fullstack_architecture_confirmed: 'Full Stack Development',
  enterprise_backend_patterns:      'Enterprise Architecture',
  production_ready_backend:         'Production Infrastructure',
  authentication_layer_present:     'Security & Authentication',
  infrastructure_as_code_present:   'Infrastructure as Code',
  strong_domain_separation:         'Domain-Driven Architecture',
  scalable_service_architecture:    'Scalable System Design',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function allPatterns(repos) {
  return [...new Set(repos.flatMap(r => r.inference?.patternsInferred || []))];
}

function getEngLevel(repos) {
  for (const r of repos) {
    const lvl = r.inference?.overallAssessment?.engineeringLevel;
    if (lvl) return lvl;
  }
  return null;
}

function getYearsExperience(experience) {
  if (!Array.isArray(experience) || !experience.length) return null;
  const parsedDates = experience
    .map(e => e.startDate)
    .filter(Boolean)
    .map(d => new Date(d))
    .filter(d => !isNaN(d.getTime()));
  if (!parsedDates.length) return null;
  const earliestMs = Math.min(...parsedDates.map(d => d.getTime()));
  const years = Math.floor((Date.now() - earliestMs) / (1000 * 60 * 60 * 24 * 365));
  return years > 0 ? years : null;
}

function inferRoleTitle(repos, careerSignals) {
  if (Array.isArray(careerSignals) && careerSignals.length) {
    const first = careerSignals[0];
    if (typeof first === 'string') return first;
    if (first?.domain) {
      const sorted = [...careerSignals]
        .filter(s => s?.domain)
        .sort((a, b) => (b.score || 0) - (a.score || 0));
      return sorted[0].domain;
    }
  }
  const patterns = allPatterns(repos);
  for (const [pattern, role] of Object.entries(ROLE_MAP)) {
    if (patterns.includes(pattern)) return role;
  }
  return null;
}

// ─── Professional Summary (4 sentences, person-focused, ATS-ready) ────────────

function buildPersonSummary(repos, experience) {
  const patterns  = allPatterns(repos);
  const engLevel  = getEngLevel(repos);
  const years     = getYearsExperience(experience);

  const levelLabel = engLevel === 'senior' ? 'Senior'
    : engLevel === 'mid'    ? 'Mid-Level'
    : engLevel === 'junior' ? 'Entry-Level'
    : null;

  // Role title from patterns
  let role = null;
  for (const [pattern, r] of Object.entries(ROLE_MAP)) {
    if (patterns.includes(pattern)) { role = r; break; }
  }

  // Top 6-7 technologies across repos (deduplicated, known categories only)
  const seen = new Set();
  const topTechs = [];
  for (const repo of repos) {
    const ci = repo.codeIntelligence;
    if (!ci) continue;
    for (const t of [...(ci.technologies || []), ...(ci.frameworks || [])]) {
      if (seen.has(t) || !TECH_CATEGORIES[t]) continue;
      seen.add(t);
      topTechs.push(TECH_LABELS[t] || t.charAt(0).toUpperCase() + t.slice(1));
      if (topTechs.length >= 7) break;
    }
    if (topTechs.length >= 7) break;
  }

  // 3-4 signal labels from patternsInferred for S3
  const signalLabels = patterns
    .filter(p => PATTERN_LABELS[p])
    .map(p => PATTERN_LABELS[p].toLowerCase())
    .slice(0, 4);

  // S1 — Identity + years + scope
  const titlePart = [levelLabel, role].filter(Boolean).join(' ') || 'Software Engineer';
  const buildContext = patterns.includes('ai_orchestrated_system')
    ? 'AI-powered applications, scalable backend platforms, and enterprise software'
    : patterns.includes('ai_integration_confirmed')
    ? 'AI-integrated applications, scalable backend services, and full-stack platforms'
    : patterns.includes('fullstack_architecture_confirmed')
    ? 'full-stack web applications, scalable backend services, and production systems'
    : patterns.includes('enterprise_backend_patterns') || patterns.includes('production_ready_backend')
    ? 'scalable backend systems, production APIs, and enterprise applications'
    : 'software applications and backend systems';

  const experiencePart = years ? ` with ${years}+ years of experience designing and delivering` : ' with experience designing and delivering';
  const s1 = `${titlePart}${experiencePart} ${buildContext}.`;

  // S2 — Core technologies + "modern cloud-native practices"
  const techSuffix = topTechs.length > 0 ? ', and modern cloud-native development practices' : '';
  const s2 = topTechs.length
    ? `Skilled in ${topTechs.join(', ')}${techSuffix}.`
    : null;

  // S3 — Proven expertise from engineering signals
  const s3 = signalLabels.length
    ? `Proven expertise in ${signalLabels.slice(0, 3).join(', ')}, and production-grade system design.`
    : null;

  // S4 — Closing passion sentence, only when AI signals are present
  const hasAi = patterns.includes('ai_orchestrated_system') || patterns.includes('ai_integration_confirmed') || patterns.includes('retrieval_augmented_architecture');
  const hasDomain = patterns.includes('strong_domain_separation') || patterns.includes('enterprise_backend_patterns');

  const s4 = hasAi
    ? 'Passionate about building intelligent systems that solve complex business problems while maintaining reliability, scalability, and engineering excellence.'
    : hasDomain
    ? 'Committed to engineering practices that prioritize maintainability, scalability, and long-term system quality.'
    : null;

  return [s1, s2, s3, s4].filter(Boolean).join(' ') || null;
}

// ─── Career Highlights (engineering level first, then years, then patterns) ───

function buildCareerHighlightsHtml(repos, experience) {
  const highlights = [];

  // Engineering level as the first bullet
  const engLevel  = getEngLevel(repos);
  const levelLabel = { senior: 'Senior', mid: 'Mid-Level', junior: 'Entry Level' }[engLevel];
  if (levelLabel) highlights.push(`${levelLabel} Engineering Level`);

  // Years of experience
  const years = getYearsExperience(experience);
  if (years) highlights.push(`${years}+ Years Professional Experience`);

  // Pattern-driven highlights
  const patterns = allPatterns(repos);
  for (const [pattern, label] of Object.entries(HIGHLIGHT_MAP)) {
    if (patterns.includes(pattern) && !highlights.includes(label)) {
      highlights.push(label);
    }
  }

  // AI features not already captured
  const aiFeatures = [...new Set(repos.flatMap(r => r.intelligence?.aiCapabilities?.aiFeatures || []))];
  for (const f of aiFeatures) {
    if (highlights.length >= 8) break;
    if (!highlights.some(h => h.toLowerCase().includes(f.toLowerCase().slice(0, 8)))) {
      highlights.push(f);
    }
  }

  if (!highlights.length) return '';

  return `
  <div class="section">
    <div class="section-title">Career Highlights</div>
    <div class="highlights-grid">
      ${highlights.slice(0, 8).map(h => `
      <div class="highlight-item">
        <span class="highlight-check">&#10003;</span>
        <span class="highlight-text">${esc(h)}</span>
      </div>`).join('')}
    </div>
  </div>`;
}

// ─── Skills aggregation ───────────────────────────────────────────────────────

function aggregateSkills(repos, topSkills) {
  const byCategory = {};

  const languages = [...new Set(repos.map(r => r.primaryLanguage).filter(Boolean))];
  if (languages.length) byCategory['Languages'] = languages;

  const seen = new Set();
  for (const repo of repos) {
    const ci = repo.codeIntelligence;
    if (!ci) continue;
    for (const t of [...(ci.technologies || []), ...(ci.frameworks || [])]) {
      if (seen.has(t)) continue;
      seen.add(t);
      const cat = TECH_CATEGORIES[t];
      if (!cat) continue;
      const label = TECH_LABELS[t] || t.charAt(0).toUpperCase() + t.slice(1);
      byCategory[cat] = byCategory[cat] || [];
      if (!byCategory[cat].includes(label)) byCategory[cat].push(label);
    }
  }

  // Fallback to narrative top_skills if deep analysis produced nothing
  if (Object.keys(byCategory).filter(k => k !== 'Languages').length === 0 && topSkills.length) {
    for (const s of topSkills) {
      const cat = s.category || 'Other';
      byCategory[cat] = byCategory[cat] || [];
      if (!byCategory[cat].includes(s.name)) byCategory[cat].push(s.name);
    }
  }

  return byCategory;
}

// ─── Engineering Signals ──────────────────────────────────────────────────────

function buildEngineeringSignals(repos) {
  const patternSet   = new Set();
  const aiFeatureSet = new Set();

  for (const repo of repos) {
    for (const p of (repo.inference?.patternsInferred || [])) {
      if (PATTERN_LABELS[p]) patternSet.add(p);
    }
    for (const f of (repo.intelligence?.aiCapabilities?.aiFeatures || [])) {
      aiFeatureSet.add(f);
    }
  }

  return {
    patterns:   [...patternSet].map(p => PATTERN_LABELS[p]),
    aiFeatures: [...aiFeatureSet].slice(0, 3),
    strengths:  [...new Set(repos.flatMap(r => r.inference?.strengths || []))].slice(0, 4),
  };
}

// ─── Project blocks ───────────────────────────────────────────────────────────

function buildProjectBlocks(projects, repos) {
  return projects.map(p => {
    const repo  = repos.find(r => r.name === p.repoName) || {};
    const ci    = repo.codeIntelligence || {};
    const intel = repo.intelligence     || {};

    // Deduplicate before slicing; use CI_ARCH_LABELS for human-readable arch labels
    const techKeys = [...new Set([...(ci.technologies || []), ...(ci.frameworks || [])])];
    const techs = techKeys
      .slice(0, 6)
      .map(t => TECH_LABELS[t] || t.charAt(0).toUpperCase() + t.slice(1));

    const archPatterns = (ci.architecturePatterns || [])
      .slice(0, 3)
      .map(a => CI_ARCH_LABELS[a] || a.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));

    const impactBullets = (intel.resume?.impactStatements || []).slice(0, 3);
    const capBullets    = (intel.skills?.engineeringCapabilities || []).slice(0, 2);
    const allBullets    = [...new Set([...impactBullets, ...capBullets])].slice(0, 4);

    const hookSentence = intel.portfolioNarrative?.hookSentence || p.oneLiner || null;

    return { name: p.repoName, hook: hookSentence, archPatterns, bullets: allBullets, techs };
  });
}

// ─── HTML builder ─────────────────────────────────────────────────────────────

function buildResumeHtml({
  title, headline, narrative, topSkills = [], projects = [],
  careerSignals = [], repos = [], githubUsername,
  profile = {}, experience = [], education = [],
}) {
  const roleTitle        = inferRoleTitle(repos, careerSignals);
  const skillsByCategory = aggregateSkills(repos, topSkills);
  const signals          = buildEngineeringSignals(repos);
  const projectBlocks    = buildProjectBlocks(projects, repos);
  const summary          = buildPersonSummary(repos, experience);

  const displayName     = profile.fullName || title || 'Developer Portfolio';
  const displayRoleLine = roleTitle || profile.headline || headline || null;

  const contactParts = [
    profile.email       ? esc(profile.email) : null,
    profile.location    ? esc(profile.location) : null,
    profile.linkedinUrl ? `<a href="${esc(ensureHttps(profile.linkedinUrl))}">${esc(profile.linkedinUrl.replace(/^https?:\/\//, ''))}</a>` : null,
    githubUsername      ? `<a href="https://github.com/${esc(githubUsername)}">github.com/${esc(githubUsername)}</a>` : null,
    profile.website     ? `<a href="${esc(ensureHttps(profile.website))}">${esc(profile.website.replace(/^https?:\/\//, ''))}</a>` : null,
  ].filter(Boolean);

  const careerHighlightsHtml = buildCareerHighlightsHtml(repos, experience);

  const signalChips = [...signals.patterns, ...signals.aiFeatures];
  const signalsHtml = signalChips.length || signals.strengths.length ? `
  <div class="section">
    <div class="section-title">Engineering Signals</div>
    ${signalChips.length ? `<div class="chips">${signalChips.map(s => `<span class="chip">${esc(s)}</span>`).join('')}</div>` : ''}
    ${signals.strengths.length ? `<ul class="signal-list">${signals.strengths.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
  </div>` : '';

  // ORM category sits between Databases and AI/ML
  const skillCategoryOrder = ['Languages', 'Backend', 'Frontend', 'Databases', 'ORM', 'AI/ML', 'DevOps', 'Integrations', 'Other'];
  const orderedSkillEntries = [
    ...skillCategoryOrder.filter(c => skillsByCategory[c]),
    ...Object.keys(skillsByCategory).filter(c => !skillCategoryOrder.includes(c)),
  ].map(cat => [cat, [...new Set(skillsByCategory[cat])]]);

  const skillsHtml = orderedSkillEntries.length ? `
  <div class="section">
    <div class="section-title">Technical Skills</div>
    ${orderedSkillEntries.map(([cat, names]) => `
    <div class="skill-row">
      <span class="skill-cat">${esc(cat)}:</span>
      <span class="skill-list">${names.map(esc).join(', ')}</span>
    </div>`).join('')}
  </div>` : '';

  const experienceHtml = experience.map(e => {
    const dateRange   = [e.startDate, e.endDate].filter(Boolean).join(' – ') + (e.duration ? ` (${e.duration})` : '');
    const companyLine = [e.company, e.location].filter(Boolean).join(', ');
    const bulletsHtml = (e.bullets || []).length
      ? `<ul class="exp-bullets">${e.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>`
      : '';
    return `
    <div class="exp-entry">
      <div class="exp-header">
        <span class="exp-role">${esc(e.role)}</span>
        ${dateRange ? `<span class="exp-date">${esc(dateRange)}</span>` : ''}
      </div>
      ${companyLine ? `<div class="exp-company">${esc(companyLine)}</div>` : ''}
      ${bulletsHtml}
    </div>`;
  }).join('');

  const educationHtml = education.map(e => {
    const years = [e.startYear, e.endYear].filter(Boolean).join(' – ');
    return `
    <div class="edu-entry">
      <div class="edu-degree">${esc(e.degree)}</div>
      <div class="edu-institution">${esc(e.institution)}${years ? ` &middot; ${esc(years)}` : ''}</div>
    </div>`;
  }).join('');

  const projectsHtml = projectBlocks.map(p => `
    <div class="project">
      <div class="project-name">${esc(fmtName(p.name))}</div>
      ${p.archPatterns.length ? `<div class="project-arch">${p.archPatterns.map(esc).join(' &middot; ')}</div>` : ''}
      ${p.hook && !p.bullets.length ? `<p class="project-hook">${esc(p.hook)}</p>` : ''}
      ${p.bullets.length ? `<ul class="project-bullets">${p.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
      ${p.techs.length ? `<p class="project-techs"><strong>Tech Stack:</strong> ${p.techs.map(esc).join(', ')}</p>` : ''}
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10.5pt;
    line-height: 1.5;
    color: #111;
    background: #fff;
  }

  /* ── Header ── */
  .header { margin-bottom: 13px; border-bottom: 2px solid #0f172a; padding-bottom: 9px; }
  .name    { font-size: 21pt; font-weight: 700; color: #0f172a; letter-spacing: -0.5px; }
  .role    { font-size: 11pt; color: #1e3a8a; margin-top: 2px; font-weight: 600; }
  .contact { font-size: 9pt; color: #475569; margin-top: 5px; }
  .contact a { color: #1e3a8a; text-decoration: none; }
  .contact-sep { color: #94a3b8; margin: 0 5px; }

  /* ── Sections ── */
  .section { margin-bottom: 12px; }
  .section-title {
    font-size: 9.5pt; font-weight: 700; color: #0f172a;
    text-transform: uppercase; letter-spacing: 1.6px;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 3px; margin-bottom: 7px;
  }

  /* ── Summary ── */
  .summary { font-size: 10pt; color: #1e293b; line-height: 1.65; }

  /* ── Career Highlights ── */
  .highlights-grid { display: flex; flex-wrap: wrap; gap: 6px 28px; }
  .highlight-item  { display: flex; align-items: center; gap: 6px; min-width: 200px; }
  .highlight-check { font-size: 10pt; color: #16a34a; font-weight: 700; flex-shrink: 0; }
  .highlight-text  { font-size: 9.5pt; color: #1e293b; font-weight: 500; }

  /* ── Engineering Signals ── */
  .chips { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 7px; }
  .chip  {
    font-size: 8.5pt; font-weight: 600; color: #1e3a8a;
    background: #eff6ff; border: 1px solid #bfdbfe;
    padding: 2px 9px; border-radius: 10px;
  }
  .signal-list    { margin: 0 0 0 14px; font-size: 9.5pt; color: #334155; }
  .signal-list li { margin-bottom: 2px; }

  /* ── Skills ── */
  .skill-row  { margin-bottom: 3px; font-size: 9.5pt; }
  .skill-cat  { font-weight: 700; color: #0f172a; margin-right: 5px; }
  .skill-list { color: #334155; }

  /* ── Experience ── */
  .exp-entry   { margin-bottom: 10px; }
  .exp-header  { display: flex; justify-content: space-between; align-items: baseline; }
  .exp-role    { font-size: 10.5pt; font-weight: 700; color: #0f172a; }
  .exp-date    { font-size: 8.5pt; color: #64748b; white-space: nowrap; margin-left: 8px; }
  .exp-company { font-size: 9.5pt; color: #475569; margin-top: 1px; font-style: italic; }
  .exp-bullets { margin: 3px 0 0 15px; font-size: 9.5pt; color: #334155; line-height: 1.5; }
  .exp-bullets li { margin-bottom: 1px; }

  /* ── Education ── */
  .edu-entry       { margin-bottom: 7px; }
  .edu-degree      { font-size: 10pt; font-weight: 600; color: #0f172a; }
  .edu-institution { font-size: 9.5pt; color: #475569; margin-top: 1px; }

  /* ── Projects ── */
  .project         { margin-bottom: 11px; }
  .project-name    { font-size: 10.5pt; font-weight: 700; color: #0f172a; }
  .project-arch    { font-size: 9pt; color: #1e3a8a; font-weight: 600; margin-top: 1px; }
  .project-hook    { font-size: 9.5pt; color: #334155; margin-top: 3px; line-height: 1.5; }
  .project-bullets { margin: 3px 0 0 15px; font-size: 9.5pt; color: #334155; line-height: 1.5; }
  .project-bullets li { margin-bottom: 1px; }
  .project-techs   { font-size: 8.5pt; color: #475569; margin-top: 4px; }
  .project-techs strong { color: #0f172a; }

  /* ── Footer ── */
  .footer {
    margin-top: 14px; border-top: 1px solid #e2e8f0;
    padding-top: 6px; font-size: 8pt; color: #94a3b8; text-align: center;
  }
</style>
</head>
<body>
<div class="resume">

  <div class="header">
    <div class="name">${esc(displayName)}</div>
    ${displayRoleLine ? `<div class="role">${esc(displayRoleLine)}</div>` : ''}
    ${contactParts.length ? `<div class="contact">${contactParts.join('<span class="contact-sep">&middot;</span>')}</div>` : ''}
  </div>

  ${summary ? `
  <div class="section">
    <div class="section-title">Professional Summary</div>
    <p class="summary">${esc(summary)}</p>
  </div>` : ''}

  ${careerHighlightsHtml}

  ${signalsHtml}

  ${experienceHtml ? `
  <div class="section">
    <div class="section-title">Experience</div>
    ${experienceHtml}
  </div>` : ''}

  ${educationHtml ? `
  <div class="section">
    <div class="section-title">Education</div>
    ${educationHtml}
  </div>` : ''}

  ${skillsHtml}

  ${projectsHtml ? `
  <div class="section">
    <div class="section-title">Projects</div>
    ${projectsHtml}
  </div>` : ''}

  <div class="footer">
    Generated by Repo2Reputation &middot; ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
  </div>

</div>
</body>
</html>`;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function fmtName(name = '') {
  return name.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim();
}

function ensureHttps(url) {
  if (!url) return url;
  return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
}

module.exports = { generatePortfolioPdf };
