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
  // Backend
  express: 'Backend',     fastify: 'Backend',     nestjs: 'Backend',
  graphql: 'Backend',     trpc: 'Backend',         koa: 'Backend',
  hono: 'Backend',        django: 'Backend',       flask: 'Backend',
  fastapi: 'Backend',     rails: 'Backend',        spring: 'Backend',
  jwt: 'Backend',         passport: 'Backend',     'next-auth': 'Backend',
  clerk: 'Backend',       'firebase-auth': 'Backend', 'rest-routes': 'Backend',
  // Frontend
  react: 'Frontend',      nextjs: 'Frontend',      vue: 'Frontend',
  angular: 'Frontend',    svelte: 'Frontend',      tailwind: 'Frontend',
  redux: 'Frontend',      zustand: 'Frontend',     jotai: 'Frontend',
  // Databases (raw storage)
  postgresql: 'Databases', mysql: 'Databases',     mongodb: 'Databases',
  redis: 'Databases',     elasticsearch: 'Databases', dynamodb: 'Databases',
  sqlite: 'Databases',
  // ORM & data-access layers
  prisma: 'ORM & Data Access',    drizzle: 'ORM & Data Access',
  mongoose: 'ORM & Data Access',  sequelize: 'ORM & Data Access',
  typeorm: 'ORM & Data Access',   knex: 'ORM & Data Access',
  // AI/ML
  openai: 'AI/ML',        anthropic: 'AI/ML',      langchain: 'AI/ML',
  llamaindex: 'AI/ML',    'vercel-ai-sdk': 'AI/ML', pinecone: 'AI/ML',
  weaviate: 'AI/ML',      chromadb: 'AI/ML',       embeddings: 'AI/ML',
  mistral: 'AI/ML',       cohere: 'AI/ML',         groq: 'AI/ML',
  // DevOps
  docker: 'DevOps',       kubernetes: 'DevOps',    'github-actions': 'DevOps',
  terraform: 'DevOps',
  // Integrations
  stripe: 'Integrations',
};

const TECH_LABELS = {
  nextjs: 'Next.js',                'next-auth': 'NextAuth',
  'vercel-ai-sdk': 'Vercel AI SDK', 'github-actions': 'GitHub Actions',
  'firebase-auth': 'Firebase Auth', graphql: 'GraphQL',
  trpc: 'tRPC',                     postgresql: 'PostgreSQL',
  mongodb: 'MongoDB',               openai: 'OpenAI API',
  langchain: 'LangChain',           llamaindex: 'LlamaIndex',
  chromadb: 'ChromaDB',             pinecone: 'Pinecone',
  weaviate: 'Weaviate',             nestjs: 'NestJS',
  tailwind: 'Tailwind CSS',         typeorm: 'TypeORM',
  dynamodb: 'DynamoDB',             elasticsearch: 'Elasticsearch',
  jwt: 'JWT',                       'rest-routes': 'REST API Design',
  embeddings: 'Vector Embeddings',
};

// code_intelligence architecturePatterns → human labels
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

// patternsInferred → job title
const ROLE_MAP = {
  ai_orchestrated_system:           'AI Engineer',
  retrieval_augmented_architecture: 'AI Engineer',
  ai_integration_confirmed:         'Full Stack AI Engineer',
  fullstack_architecture_confirmed: 'Full Stack Engineer',
  production_ready_backend:         'Backend Engineer',
  enterprise_backend_patterns:      'Backend Engineer',
  modular_frontend_architecture:    'Frontend Engineer',
};

// patternsInferred → natural-language specialization phrase for summary
const SPEC_MAP = {
  ai_orchestrated_system:           'designing and integrating large language model orchestration systems',
  retrieval_augmented_architecture: 'building retrieval-augmented generation (RAG) pipelines',
  ai_integration_confirmed:         'integrating AI and LLM capabilities into production applications',
  fullstack_architecture_confirmed: 'full-stack application architecture and system design',
  production_ready_backend:         'production-grade backend development and API design',
  enterprise_backend_patterns:      'enterprise backend architecture and domain-driven design',
  infrastructure_as_code_present:   'infrastructure automation and cloud-native deployment',
  strong_domain_separation:         'domain-driven system design and modular architecture',
  scalable_service_architecture:    'designing scalable service architectures for high-load systems',
};

// Industry hints derived from known employer names
const INDUSTRY_HINTS = {
  'marine corps':     'defense',
  'military':         'defense',
  'army':             'defense',
  'navy':             'defense',
  'cb richard ellis': 'commercial real estate',
  'cbre':             'commercial real estate',
  'wizetrade':        'financial technology',
  'associates':       'technology consulting',
  'consulting':       'technology consulting',
};

// Generic AI-assessment phrases to filter from project bullets
const GENERIC_PATTERNS = [
  'managed architectural complexity',
  'operated across a',
  'engineering capability detected',
  'applied engineering best practices',
  'spanning the full application lifecycle',
  'interconnected system components',
  'technology stack spanning',
];

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
  const dates = experience
    .map(e => e.startDate).filter(Boolean)
    .map(d => new Date(d)).filter(d => !isNaN(d.getTime()));
  if (!dates.length) return null;
  const years = Math.floor((Date.now() - Math.min(...dates.map(d => d.getTime()))) / (1000 * 60 * 60 * 24 * 365));
  return years > 0 ? years : null;
}

function inferRoleTitle(repos, careerSignals) {
  if (Array.isArray(careerSignals) && careerSignals.length) {
    const first = careerSignals[0];
    if (typeof first === 'string') return first;
    if (first?.domain) {
      return [...careerSignals].filter(s => s?.domain).sort((a, b) => (b.score || 0) - (a.score || 0))[0].domain;
    }
  }
  const patterns = allPatterns(repos);
  for (const [pat, role] of Object.entries(ROLE_MAP)) {
    if (patterns.includes(pat)) return role;
  }
  return null;
}

function extractIndustries(experience) {
  const found = new Set();
  for (const exp of (experience || [])) {
    const co = (exp.company || '').toLowerCase();
    for (const [key, industry] of Object.entries(INDUSTRY_HINTS)) {
      if (co.includes(key)) { found.add(industry); break; }
    }
  }
  return [...found].slice(0, 3);
}

function isGenericBullet(b) {
  const lower = b.toLowerCase();
  return GENERIC_PATTERNS.some(g => lower.includes(g));
}

// ─── Professional Summary (4 sentences, career-focused, human-sounding) ───────

function buildPersonSummary(repos, experience, careerSignals) {
  const patterns   = allPatterns(repos);
  const engLevel   = getEngLevel(repos);
  const years      = getYearsExperience(experience);
  const industries = extractIndustries(experience);

  const levelLabel = { senior: 'Senior', mid: 'Mid-Level', junior: 'Entry-Level' }[engLevel] || null;
  let role = null;
  for (const [pat, r] of Object.entries(ROLE_MAP)) {
    if (patterns.includes(pat)) { role = r; break; }
  }
  const titlePart = [levelLabel, role].filter(Boolean).join(' ') || 'Software Engineer';

  // S1 — Identity + years + industry breadth
  const yearsPart = years ? `${years}+ years of experience` : 'extensive experience';
  const industryPhrase = industries.length >= 2
    ? `across ${industries.slice(0, -1).join(', ')}, and ${industries[industries.length - 1]}`
    : 'across enterprise software and cloud-native systems';
  const s1 = `${titlePart} with ${yearsPart} delivering production-grade software systems ${industryPhrase}.`;

  // S2 — Specializations derived from patternsInferred
  const specs = patterns.filter(p => SPEC_MAP[p]).slice(0, 3).map(p => SPEC_MAP[p]);
  const s2 = specs.length ? `Specializes in ${specs.join(', ')}.` : null;

  // S3 — Technologies in AI-first category priority
  const CAT_PRIORITY = ['AI/ML', 'Backend', 'Databases', 'ORM & Data Access', 'Frontend', 'DevOps'];
  const seenTech = new Set();
  const priorityTechs = [];
  outer: for (const cat of CAT_PRIORITY) {
    for (const repo of repos) {
      const ci = repo.codeIntelligence;
      if (!ci) continue;
      for (const t of [...(ci.technologies || []), ...(ci.frameworks || [])]) {
        if (TECH_CATEGORIES[t] !== cat || seenTech.has(t)) continue;
        seenTech.add(t);
        priorityTechs.push(TECH_LABELS[t] || t.charAt(0).toUpperCase() + t.slice(1));
        if (priorityTechs.length >= 7) break outer;
      }
    }
  }
  const s3 = priorityTechs.length ? `Proficient in ${priorityTechs.join(', ')}.` : null;

  // S4 — Closing value statement
  const isAI       = patterns.includes('ai_orchestrated_system') || patterns.includes('ai_integration_confirmed');
  const isFullstack = patterns.includes('fullstack_architecture_confirmed');
  const s4 = (engLevel === 'senior' && isAI)
    ? 'Combines strategic technical leadership with hands-on engineering to deliver intelligent systems that are reliable, scalable, and built for long-term growth.'
    : (engLevel === 'senior' && isFullstack)
    ? 'Brings a systems-thinking approach to engineering, balancing architectural quality with practical delivery across the full application stack.'
    : engLevel === 'senior'
    ? 'Known for building production-grade systems that prioritize reliability, observability, and long-term maintainability.'
    : isAI
    ? 'Passionate about applying AI and modern engineering practices to build systems that solve real-world problems effectively.'
    : 'Committed to engineering practices that prioritize clarity, reliability, and long-term system quality.';

  return [s1, s2, s3, s4].filter(Boolean).join(' ') || null;
}

// ─── Synthesized accomplishment bullets from architecture patterns ─────────────

function buildArchBullets(archPatterns, techs, frameworks) {
  const all = [...new Set([...techs, ...frameworks])];
  const bullets = [];

  const ARCH_BULLET = {
    rest_api: () => {
      const hasAuth = all.includes('jwt') || all.includes('passport');
      return hasAuth
        ? 'Designed RESTful API with JWT-based authentication for secure, stateless client communication'
        : 'Designed and implemented RESTful API with structured resource routing and response handling';
    },
    stateless_auth: () =>
      'Implemented stateless JWT authentication for secure API access and session management',
    orm: () => {
      const orm = all.find(t => ['sequelize','prisma','typeorm','mongoose','drizzle','knex'].includes(t));
      const label = orm ? (TECH_LABELS[orm] || orm.charAt(0).toUpperCase() + orm.slice(1)) : null;
      return label
        ? `Built data access layer with ${label} for structured database interaction and query management`
        : 'Built ORM-based data access layer for structured database interaction';
    },
    containerization: () => all.includes('kubernetes')
      ? 'Containerized all services with Docker and deployed to Kubernetes for horizontal scaling and high availability'
      : 'Containerized application with Docker for consistent, portable deployment across environments',
    container_orchestration: () =>
      'Orchestrated containerized services with Kubernetes for automated scaling, rolling deployments, and fault tolerance',
    cicd_pipeline: () => {
      const ciLabel = all.includes('github-actions') ? 'GitHub Actions' : 'CI/CD tooling';
      return `Automated build, test, and deployment pipeline using ${ciLabel} to support continuous delivery`;
    },
    infrastructure_as_code: () => {
      const iac = all.find(t => ['terraform','pulumi'].includes(t));
      const iacLabel = iac ? (TECH_LABELS[iac] || iac.charAt(0).toUpperCase() + iac.slice(1)) : 'Terraform';
      return `Managed cloud infrastructure as code with ${iacLabel} for reproducible, version-controlled environments`;
    },
    llm_integration: () => {
      const llm = all.find(t => ['openai','anthropic','langchain','llamaindex','mistral'].includes(t));
      const llmLabel = llm ? (TECH_LABELS[llm] || llm.charAt(0).toUpperCase() + llm.slice(1)) : 'OpenAI';
      return `Integrated ${llmLabel} to power AI-driven features including natural language processing and intelligent automation`;
    },
    llm_orchestration: () =>
      'Built multi-step LLM orchestration pipeline coordinating prompts, context management, and structured output generation',
    rag_framework: () =>
      'Implemented retrieval-augmented generation (RAG) pipeline combining vector search with LLM responses for context-aware output',
    vector_database: () => {
      const vdb = all.find(t => ['pinecone','chromadb','weaviate'].includes(t));
      const vdbLabel = vdb ? (TECH_LABELS[vdb] || vdb.charAt(0).toUpperCase() + vdb.slice(1)) : 'vector database';
      return `Integrated ${vdbLabel} for semantic search, embedding storage, and similarity-based retrieval`;
    },
    relational_database: () => {
      const db = all.find(t => ['postgresql','mysql','sqlite'].includes(t));
      const dbLabel = db ? (TECH_LABELS[db] || db.charAt(0).toUpperCase() + db.slice(1)) : 'relational database';
      return `Designed normalized ${dbLabel} schema with optimized query patterns for core business data`;
    },
    global_state_management: () =>
      'Implemented global state management for complex client-side data flows and cross-component synchronization',
  };

  for (const pat of archPatterns) {
    if (bullets.length >= 3) break;
    if (ARCH_BULLET[pat]) {
      const b = ARCH_BULLET[pat]();
      if (b) bullets.push(b);
    }
  }

  return bullets;
}

// ─── Project description line ─────────────────────────────────────────────────

function cleanProjectDescription(overview, hookSentence) {
  const raw = overview || hookSentence;
  if (!raw) return null;
  let s = raw
    .replace(/^This\s+(repository|repo|project)\s+(is\s+|implements?\s+)?/i, '')
    .replace(/^[Aa]n?\s+[\w\s,+\-\/]+?-powered\s+/i, '')
    .replace(/^[Aa]n?\s+/, '')
    .replace(/\s+spanning\s+\d+\s+architectural\s+layers?[^.]*\.?/gi, '.')
    .replace(/\s+across\s+\d+\s+(interconnected\s+)?components?[^.]*\.?/gi, '.')
    .trim();
  if (!s) return null;
  s = s.charAt(0).toUpperCase() + s.slice(1);
  if (!s.endsWith('.')) s += '.';
  return s;
}

// ─── Project blocks ───────────────────────────────────────────────────────────

function buildProjectBlocks(projects, repos) {
  return projects.map(p => {
    const repo  = repos.find(r => r.name === p.repoName) || {};
    const ci    = repo.codeIntelligence || {};
    const intel = repo.intelligence     || {};

    // One-line description of what the project is
    const desc = cleanProjectDescription(
      intel.executiveSummary?.overview,
      intel.portfolioNarrative?.hookSentence || p.oneLiner,
    );

    // Priority 1: technicalDifferentiation — what's technically interesting (human-sounding)
    const techDiff = (intel.portfolioNarrative?.technicalDifferentiation || [])
      .filter(b => !isGenericBullet(b)).slice(0, 2);

    // Priority 2: operationalCapabilities — what the system actually does
    const opCaps = (intel.businessValue?.operationalCapabilities || [])
      .filter(b => !isGenericBullet(b)).slice(0, 2);

    const humanBullets = [...new Set([...techDiff, ...opCaps])].slice(0, 3);

    // Priority 3: synthesized arch bullets to supplement or replace generic ones
    const archBullets = buildArchBullets(
      ci.architecturePatterns || [],
      ci.technologies || [],
      ci.frameworks || [],
    );

    const finalBullets = [...humanBullets];
    for (const b of archBullets) {
      if (finalBullets.length >= 4) break;
      if (!finalBullets.some(ex => ex.toLowerCase().slice(0, 25) === b.toLowerCase().slice(0, 25))) {
        finalBullets.push(b);
      }
    }

    // Tech stack: deduplicate, limit to 6, display labels
    const techKeys = [...new Set([...(ci.technologies || []), ...(ci.frameworks || [])])];
    const techs = techKeys
      .slice(0, 6)
      .map(t => TECH_LABELS[t] || t.charAt(0).toUpperCase() + t.slice(1));

    return { name: p.repoName, desc, bullets: finalBullets.slice(0, 4), techs };
  });
}

// ─── Skills aggregation ───────────────────────────────────────────────────────

function aggregateSkills(repos, topSkills, patterns) {
  const byCategory = {};

  // Primary languages from repo metadata
  const languages = [...new Set(repos.map(r => r.primaryLanguage).filter(Boolean))];
  if (languages.length) byCategory['Languages'] = [...languages];

  // Technologies from code intelligence
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

  // Fallback to narrative top_skills
  if (Object.keys(byCategory).filter(k => k !== 'Languages').length === 0 && topSkills.length) {
    for (const s of topSkills) {
      const cat = s.category || 'Other';
      byCategory[cat] = byCategory[cat] || [];
      if (!byCategory[cat].includes(s.name)) byCategory[cat].push(s.name);
    }
  }

  // Implied languages
  const langs = byCategory['Languages'] || [];
  if (langs.includes('TypeScript') && !langs.includes('JavaScript')) langs.push('JavaScript');
  const hasRelDb = (byCategory['Databases'] || []).some(d => ['PostgreSQL','MySQL','SQLite'].includes(d));
  if (hasRelDb && !langs.includes('SQL')) {
    byCategory['Languages'] = byCategory['Languages'] || [];
    byCategory['Languages'].push('SQL');
  }

  // Pattern-derived additions to AI/ML
  const pats = patterns || [];
  if (pats.includes('ai_orchestrated_system') || pats.includes('retrieval_augmented_architecture')) {
    byCategory['AI/ML'] = byCategory['AI/ML'] || [];
    if (!byCategory['AI/ML'].includes('LLM Orchestration')) byCategory['AI/ML'].push('LLM Orchestration');
  }
  if (pats.includes('retrieval_augmented_architecture')) {
    byCategory['AI/ML'] = byCategory['AI/ML'] || [];
    if (!byCategory['AI/ML'].includes('RAG Pipelines')) byCategory['AI/ML'].push('RAG Pipelines');
  }

  return byCategory;
}

// ─── HTML builder ─────────────────────────────────────────────────────────────

function buildResumeHtml({
  title, headline, narrative, topSkills = [], projects = [],
  careerSignals = [], repos = [], githubUsername,
  profile = {}, experience = [], education = [],
}) {
  const roleTitle     = inferRoleTitle(repos, careerSignals);
  const patterns      = allPatterns(repos);
  const skillsByCategory = aggregateSkills(repos, topSkills, patterns);
  const projectBlocks = buildProjectBlocks(projects, repos);
  const summary       = buildPersonSummary(repos, experience, careerSignals);

  const displayName     = profile.fullName || title || 'Developer Portfolio';
  const displayRoleLine = roleTitle || profile.headline || headline || null;

  const contactParts = [
    profile.email       ? esc(profile.email) : null,
    profile.location    ? esc(profile.location) : null,
    profile.linkedinUrl ? `<a href="${esc(ensureHttps(profile.linkedinUrl))}">${esc(profile.linkedinUrl.replace(/^https?:\/\//, ''))}</a>` : null,
    githubUsername      ? `<a href="https://github.com/${esc(githubUsername)}">github.com/${esc(githubUsername)}</a>` : null,
    profile.website     ? `<a href="${esc(ensureHttps(profile.website))}">${esc(profile.website.replace(/^https?:\/\//, ''))}</a>` : null,
  ].filter(Boolean);

  // Skills — ORM & Data Access sits between Databases and AI/ML
  const SKILL_ORDER = ['Languages', 'Backend', 'Frontend', 'Databases', 'ORM & Data Access', 'AI/ML', 'DevOps', 'Integrations', 'Other'];
  const orderedSkillEntries = [
    ...SKILL_ORDER.filter(c => skillsByCategory[c]),
    ...Object.keys(skillsByCategory).filter(c => !SKILL_ORDER.includes(c)),
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

  const experienceHtml = (experience || []).map(e => {
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

  const educationHtml = (education || []).map(e => {
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
      ${p.desc ? `<p class="project-desc">${esc(p.desc)}</p>` : ''}
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
  .header  { margin-bottom: 14px; border-bottom: 2px solid #0f172a; padding-bottom: 9px; }
  .name    { font-size: 21pt; font-weight: 700; color: #0f172a; letter-spacing: -0.5px; }
  .role    { font-size: 11pt; color: #1e3a8a; margin-top: 2px; font-weight: 600; }
  .contact { font-size: 9pt; color: #475569; margin-top: 5px; }
  .contact a { color: #1e3a8a; text-decoration: none; }
  .contact-sep { color: #94a3b8; margin: 0 5px; }

  /* ── Sections ── */
  .section { margin-bottom: 13px; }
  .section-title {
    font-size: 9.5pt; font-weight: 700; color: #0f172a;
    text-transform: uppercase; letter-spacing: 1.6px;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 3px; margin-bottom: 8px;
  }

  /* ── Summary ── */
  .summary { font-size: 10pt; color: #1e293b; line-height: 1.7; }

  /* ── Skills ── */
  .skill-row  { margin-bottom: 4px; font-size: 9.5pt; }
  .skill-cat  { font-weight: 700; color: #0f172a; margin-right: 5px; }
  .skill-list { color: #334155; }

  /* ── Experience ── */
  .exp-entry   { margin-bottom: 11px; }
  .exp-header  { display: flex; justify-content: space-between; align-items: baseline; }
  .exp-role    { font-size: 10.5pt; font-weight: 700; color: #0f172a; }
  .exp-date    { font-size: 8.5pt; color: #64748b; white-space: nowrap; margin-left: 8px; }
  .exp-company { font-size: 9.5pt; color: #475569; margin-top: 1px; font-style: italic; }
  .exp-bullets { margin: 3px 0 0 16px; font-size: 9.5pt; color: #334155; line-height: 1.5; }
  .exp-bullets li { margin-bottom: 2px; }

  /* ── Education ── */
  .edu-entry       { margin-bottom: 7px; }
  .edu-degree      { font-size: 10pt; font-weight: 600; color: #0f172a; }
  .edu-institution { font-size: 9.5pt; color: #475569; margin-top: 1px; }

  /* ── Projects ── */
  .project         { margin-bottom: 13px; }
  .project-name    { font-size: 10.5pt; font-weight: 700; color: #0f172a; }
  .project-desc    { font-size: 9.5pt; color: #475569; margin-top: 2px; font-style: italic; line-height: 1.45; }
  .project-bullets { margin: 5px 0 0 16px; font-size: 9.5pt; color: #334155; line-height: 1.55; }
  .project-bullets li { margin-bottom: 2px; }
  .project-techs   { font-size: 8.5pt; color: #475569; margin-top: 5px; }
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
