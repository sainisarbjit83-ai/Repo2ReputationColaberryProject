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
      margin: { top: '16mm', right: '16mm', bottom: '16mm', left: '16mm' },
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

// ─── Tech category map ────────────────────────────────────────────────────────
// Maps detected technology keys → resume category labels

const TECH_CATEGORIES = {
  // Languages (derived from primary_language — handled separately)
  // Backend
  express: 'Backend',   fastify: 'Backend',   nestjs: 'Backend',
  graphql: 'Backend',   trpc: 'Backend',      koa: 'Backend',
  hono: 'Backend',      django: 'Backend',    flask: 'Backend',
  fastapi: 'Backend',   rails: 'Backend',     spring: 'Backend',
  // Frontend
  react: 'Frontend',    nextjs: 'Frontend',   vue: 'Frontend',
  angular: 'Frontend',  svelte: 'Frontend',   tailwind: 'Frontend',
  redux: 'Frontend',    zustand: 'Frontend',  jotai: 'Frontend',
  // Databases
  postgresql: 'Databases', mysql: 'Databases',  mongodb: 'Databases',
  redis: 'Databases',      prisma: 'Databases', drizzle: 'Databases',
  mongoose: 'Databases',   sequelize: 'Databases', typeorm: 'Databases',
  knex: 'Databases',       elasticsearch: 'Databases', dynamodb: 'Databases',
  // AI/ML
  openai: 'AI/ML',      anthropic: 'AI/ML',  langchain: 'AI/ML',
  llamaindex: 'AI/ML',  'vercel-ai-sdk': 'AI/ML', pinecone: 'AI/ML',
  weaviate: 'AI/ML',    chromadb: 'AI/ML',   embeddings: 'AI/ML',
  mistral: 'AI/ML',     cohere: 'AI/ML',     groq: 'AI/ML',
  // DevOps & Cloud
  docker: 'DevOps',     kubernetes: 'DevOps', 'github-actions': 'DevOps',
  terraform: 'DevOps',  stripe: 'Integrations',
  // Auth (surface under Backend if no other category fits)
  jwt: 'Backend',       passport: 'Backend',  'next-auth': 'Backend',
  clerk: 'Backend',     'firebase-auth': 'Backend',
};

const TECH_LABELS = {
  nextjs: 'Next.js', 'next-auth': 'NextAuth', 'vercel-ai-sdk': 'Vercel AI SDK',
  'github-actions': 'GitHub Actions', 'firebase-auth': 'Firebase Auth',
  graphql: 'GraphQL', trpc: 'tRPC', postgresql: 'PostgreSQL', mongodb: 'MongoDB',
  openai: 'OpenAI', langchain: 'LangChain', llamaindex: 'LlamaIndex',
  chromadb: 'ChromaDB', pinecone: 'Pinecone', weaviate: 'Weaviate',
  nestjs: 'NestJS', tailwind: 'Tailwind CSS', typeorm: 'TypeORM',
  dynamodb: 'DynamoDB', elasticsearch: 'Elasticsearch',
};

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

const ROLE_MAP = {
  ai_orchestrated_system:           'AI Engineer',
  retrieval_augmented_architecture: 'AI Engineer',
  ai_integration_confirmed:         'AI-Integrated Full Stack Engineer',
  fullstack_architecture_confirmed: 'Full Stack Engineer',
  production_ready_backend:         'Backend Engineer',
  enterprise_backend_patterns:      'Backend Engineer',
  modular_frontend_architecture:    'Frontend Engineer',
};

// ─── Data aggregation helpers ─────────────────────────────────────────────────

function inferRoleTitle(repos, careerSignals) {
  if (careerSignals?.length) return careerSignals[0];

  for (const repo of repos) {
    const patterns = repo.inference?.patternsInferred || [];
    for (const [pattern, role] of Object.entries(ROLE_MAP)) {
      if (patterns.includes(pattern)) return role;
    }
  }
  return null;
}

function aggregateSkills(repos, topSkills) {
  const byCategory = {};

  // Collect languages from primaryLanguage across repos
  const languages = [...new Set(
    repos.map(r => r.primaryLanguage).filter(Boolean)
  )];
  if (languages.length) byCategory['Languages'] = languages;

  // Collect technologies from deep analysis across all repos
  const seen = new Set();
  for (const repo of repos) {
    const ci = repo.codeIntelligence;
    if (!ci) continue;
    const techs = [...(ci.technologies || []), ...(ci.frameworks || [])];
    for (const t of techs) {
      if (seen.has(t)) continue;
      seen.add(t);
      const cat = TECH_CATEGORIES[t];
      if (!cat) continue;
      const label = TECH_LABELS[t] || t.charAt(0).toUpperCase() + t.slice(1);
      byCategory[cat] = byCategory[cat] || [];
      byCategory[cat].push(label);
    }
  }

  // Fall back to narrative top_skills if no deep analysis techs found
  if (Object.keys(byCategory).filter(k => k !== 'Languages').length === 0 && topSkills.length) {
    for (const s of topSkills) {
      const cat = s.category || 'Other';
      byCategory[cat] = byCategory[cat] || [];
      byCategory[cat].push(s.name);
    }
  }

  return byCategory;
}

function buildEngineeringSignals(repos) {
  const patternSet = new Set();
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
    aiFeatures: [...aiFeatureSet].slice(0, 4),
    strengths:  [...new Set(
      repos.flatMap(r => r.inference?.strengths || [])
    )].slice(0, 4),
  };
}

function buildProjectBlocks(projects, repos) {
  return projects.map(p => {
    const repo = repos.find(r => r.name === p.repoName) || {};
    const ci   = repo.codeIntelligence || {};
    const intel = repo.intelligence    || {};

    const techs = [
      ...(ci.technologies || []),
      ...(ci.frameworks   || []),
    ].slice(0, 8).map(t => TECH_LABELS[t] || t.charAt(0).toUpperCase() + t.slice(1));

    const archPatterns = (ci.architecturePatterns || [])
      .slice(0, 3)
      .map(a => a.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));

    const impactBullets = (intel.resume?.impactStatements || []).slice(0, 3);
    const capBullets    = (intel.skills?.engineeringCapabilities || []).slice(0, 2);

    // Combine impact + capability bullets, deduplicate, cap at 4
    const allBullets = [...new Set([...impactBullets, ...capBullets])].slice(0, 4);

    const hookSentence = intel.portfolioNarrative?.hookSentence || p.oneLiner || null;

    return {
      name:         p.repoName,
      hook:         hookSentence,
      archPatterns,
      bullets:      allBullets,
      techs,
    };
  });
}

function buildSummary(narrative, repos) {
  // Prefer deep analysis hook sentence from highest-confidence repo
  for (const repo of repos) {
    const hook = repo.intelligence?.portfolioNarrative?.hookSentence;
    const impact = repo.intelligence?.portfolioNarrative?.projectImpact;
    if (hook) {
      return impact ? `${hook} ${impact}` : hook;
    }
  }
  // Fall back to portfolio narrative (truncated)
  if (narrative) {
    const sentences = narrative.split(/(?<=[.!?])\s+/);
    return sentences.slice(0, 3).join(' ');
  }
  return null;
}

// ─── HTML builder ─────────────────────────────────────────────────────────────

function buildResumeHtml({
  title, headline, narrative, topSkills = [], projects = [],
  careerSignals = [], repos = [], githubUsername,
  profile = {}, experience = [], education = [],
}) {
  const roleTitle      = inferRoleTitle(repos, careerSignals);
  const skillsByCategory = aggregateSkills(repos, topSkills);
  const signals        = buildEngineeringSignals(repos);
  const projectBlocks  = buildProjectBlocks(projects, repos);
  const summary        = buildSummary(narrative, repos);

  const displayName    = profile.fullName || title || 'Developer Portfolio';
  const displayHeadline = roleTitle || profile.headline || headline || '';

  const contactParts = [
    profile.email       ? esc(profile.email)    : null,
    profile.location    ? esc(profile.location)  : null,
    profile.linkedinUrl ? `<a href="${esc(ensureHttps(profile.linkedinUrl))}">${esc(profile.linkedinUrl.replace(/^https?:\/\//,''))}</a>` : null,
    githubUsername      ? `<a href="https://github.com/${esc(githubUsername)}">github.com/${esc(githubUsername)}</a>` : null,
    profile.website     ? `<a href="${esc(ensureHttps(profile.website))}">${esc(profile.website.replace(/^https?:\/\//,''))}</a>` : null,
  ].filter(Boolean);

  // ── Section HTML builders ──────────────────────────────────────────────────

  const signalChips = [...signals.patterns, ...signals.aiFeatures];

  const signalsHtml = signalChips.length || signals.strengths.length ? `
  <div class="section">
    <div class="section-title">Engineering Signals</div>
    ${signalChips.length ? `
    <div class="chips">
      ${signalChips.map(s => `<span class="chip">${esc(s)}</span>`).join('')}
    </div>` : ''}
    ${signals.strengths.length ? `
    <ul class="signal-list">
      ${signals.strengths.map(s => `<li>${esc(s)}</li>`).join('')}
    </ul>` : ''}
  </div>` : '';

  const skillCategoryOrder = ['Languages', 'Backend', 'Frontend', 'Databases', 'AI/ML', 'DevOps', 'Integrations', 'Other'];
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
    const dateRange  = [e.startDate, e.endDate].filter(Boolean).join(' – ') + (e.duration ? ` (${e.duration})` : '');
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
      ${p.bullets.length ? `
      <ul class="project-bullets">
        ${p.bullets.map(b => `<li>${esc(b)}</li>`).join('')}
      </ul>` : ''}
      ${p.techs.length ? `<p class="project-techs">${p.techs.map(esc).join(' &middot; ')}</p>` : ''}
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

  .header { margin-bottom: 14px; border-bottom: 2px solid #0f172a; padding-bottom: 10px; }
  .name     { font-size: 21pt; font-weight: 700; color: #0f172a; letter-spacing: -0.5px; }
  .role     { font-size: 11pt; color: #1e3a8a; margin-top: 2px; font-weight: 600; }
  .contact  { font-size: 9pt; color: #475569; margin-top: 5px; }
  .contact a { color: #1e3a8a; text-decoration: none; }
  .contact-sep { color: #94a3b8; margin: 0 5px; }

  .section { margin-bottom: 13px; }
  .section-title {
    font-size: 9.5pt;
    font-weight: 700;
    color: #0f172a;
    text-transform: uppercase;
    letter-spacing: 1.6px;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 3px;
    margin-bottom: 7px;
  }

  .summary { font-size: 10pt; color: #1e293b; line-height: 1.6; }

  .chips { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 7px; }
  .chip  {
    font-size: 8.5pt; font-weight: 600; color: #1e3a8a;
    background: #eff6ff; border: 1px solid #bfdbfe;
    padding: 2px 9px; border-radius: 10px;
  }
  .signal-list { margin: 0 0 0 14px; font-size: 9.5pt; color: #334155; }
  .signal-list li { margin-bottom: 2px; }

  .skill-row  { margin-bottom: 3px; font-size: 9.5pt; }
  .skill-cat  { font-weight: 700; color: #0f172a; margin-right: 5px; }
  .skill-list { color: #334155; }

  .exp-entry   { margin-bottom: 10px; }
  .exp-header  { display: flex; justify-content: space-between; align-items: baseline; }
  .exp-role    { font-size: 10.5pt; font-weight: 700; color: #0f172a; }
  .exp-date    { font-size: 8.5pt; color: #64748b; white-space: nowrap; margin-left: 8px; }
  .exp-company { font-size: 9.5pt; color: #475569; margin-top: 1px; font-style: italic; }
  .exp-bullets { margin: 3px 0 0 15px; font-size: 9.5pt; color: #334155; line-height: 1.5; }
  .exp-bullets li { margin-bottom: 1px; }

  .edu-entry       { margin-bottom: 7px; }
  .edu-degree      { font-size: 10pt; font-weight: 600; color: #0f172a; }
  .edu-institution { font-size: 9.5pt; color: #475569; margin-top: 1px; }

  .project         { margin-bottom: 11px; }
  .project-name    { font-size: 10.5pt; font-weight: 700; color: #0f172a; }
  .project-arch    { font-size: 9pt; color: #1e3a8a; font-weight: 600; margin-top: 1px; }
  .project-hook    { font-size: 9.5pt; color: #334155; margin-top: 3px; line-height: 1.5; }
  .project-bullets { margin: 3px 0 0 15px; font-size: 9.5pt; color: #334155; line-height: 1.5; }
  .project-bullets li { margin-bottom: 1px; }
  .project-techs   { font-size: 8.5pt; color: #64748b; margin-top: 4px; }

  .footer {
    margin-top: 16px;
    border-top: 1px solid #e2e8f0;
    padding-top: 7px;
    font-size: 8pt;
    color: #94a3b8;
    text-align: center;
  }
</style>
</head>
<body>
<div class="resume">

  <div class="header">
    <div class="name">${esc(displayName)}</div>
    ${displayHeadline ? `<div class="role">${esc(displayHeadline)}</div>` : ''}
    ${contactParts.length ? `<div class="contact">${contactParts.join('<span class="contact-sep">&middot;</span>')}</div>` : ''}
  </div>

  ${summary ? `
  <div class="section">
    <div class="section-title">Professional Summary</div>
    <p class="summary">${esc(summary)}</p>
  </div>` : ''}

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
