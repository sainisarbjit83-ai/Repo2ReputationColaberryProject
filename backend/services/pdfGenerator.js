'use strict';

const puppeteer = require('puppeteer');

/**
 * Launches a headless browser, renders the resume HTML, and returns a PDF buffer.
 * @param {object} data  Normalised portfolio data from the public portfolio endpoint
 * @returns {Buffer} Raw PDF bytes
 */
async function generatePortfolioPdf(data) {
  const html = buildResumeHtml(data);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    // Use domcontentloaded — no external resources to wait for
    await page.setContent(html, { waitUntil: 'domcontentloaded' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: false,
      margin: { top: '18mm', right: '16mm', bottom: '18mm', left: '16mm' },
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

// ─── HTML builder ──────────────────────────────────────────────────────────────

function buildResumeHtml({ title, headline, narrative, topSkills = [], projects = [], repos = [], githubUsername, profile = {}, experience = [], education = [] }) {
  const skillsByCategory = topSkills.reduce((acc, s) => {
    const cat = s.category || 'Other';
    (acc[cat] = acc[cat] || []).push(s.name);
    return acc;
  }, {});

  const projectBlocks = projects.map(p => {
    const repo  = repos.find(r => r.name === p.repoName) || {};
    const techs = (repo.analysis?.technologies || []).slice(0, 6).map(t => t.name);
    return { name: p.repoName, oneLiner: p.oneLiner, techs };
  });

  const skillsHtml = Object.entries(skillsByCategory).map(([cat, names]) => `
    <div class="skill-row">
      <span class="skill-cat">${esc(cat)}:</span>
      <span class="skill-list">${names.map(esc).join(' · ')}</span>
    </div>`).join('');

  const projectsHtml = projectBlocks.map(p => `
    <div class="project">
      <div class="project-name">${esc(fmtName(p.name))}</div>
      ${p.oneLiner ? `<p class="project-desc">${esc(p.oneLiner)}</p>` : ''}
      ${p.techs.length ? `<p class="project-techs">Technologies: ${p.techs.map(esc).join(', ')}</p>` : ''}
    </div>`).join('');

  const experienceHtml = experience.map(e => {
    const dateRange = [e.startDate, e.endDate].filter(Boolean).join(' – ') + (e.duration ? ` (${e.duration})` : '');
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

  const displayName = profile.fullName || title || 'Developer Portfolio';
  const displayHeadline = profile.headline || headline;

  const contactLine = [
    profile.email       ? esc(profile.email) : null,
    profile.location    ? esc(profile.location) : null,
    profile.linkedinUrl ? `<a href="${esc(profile.linkedinUrl)}">${esc(profile.linkedinUrl)}</a>` : null,
    profile.website     ? `<a href="${esc(profile.website)}">${esc(profile.website)}</a>` : null,
    githubUsername      ? `<a href="https://github.com/${esc(githubUsername)}">github.com/${esc(githubUsername)}</a>` : null,
  ].filter(Boolean).join(' &middot; ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10.5pt;
    line-height: 1.55;
    color: #111;
    background: #fff;
  }
  .resume { padding: 0; }

  .header {
    margin-bottom: 16px;
    border-bottom: 2px solid #1a1a1a;
    padding-bottom: 10px;
  }
  .name     { font-size: 22pt; font-weight: 700; color: #0f172a; letter-spacing: -0.5px; }
  .headline { font-size: 12pt; color: #3b4a6b; margin-top: 3px; font-weight: 500; }
  .contact  { font-size: 9.5pt; color: #475569; margin-top: 6px; }
  .contact a { color: #3b4a6b; text-decoration: none; }

  .section { margin-bottom: 14px; }
  .section-title {
    font-size: 10pt;
    font-weight: 700;
    color: #0f172a;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 3px;
    margin-bottom: 8px;
  }

  .summary  { font-size: 10.5pt; color: #334155; line-height: 1.65; }

  .skill-row  { margin-bottom: 4px; font-size: 10pt; }
  .skill-cat  { font-weight: 600; color: #1e3a5f; margin-right: 5px; }
  .skill-list { color: #334155; }

  .project       { margin-bottom: 11px; }
  .project-name  { font-size: 11pt; font-weight: 700; color: #0f172a; }
  .project-desc  { font-size: 10pt; color: #334155; margin-top: 2px; line-height: 1.5; }
  .project-techs { font-size: 9.5pt; color: #64748b; margin-top: 3px; font-style: italic; }

  .exp-entry     { margin-bottom: 11px; }
  .exp-header    { display: flex; justify-content: space-between; align-items: baseline; }
  .exp-role      { font-size: 11pt; font-weight: 700; color: #0f172a; }
  .exp-date      { font-size: 9pt; color: #64748b; white-space: nowrap; margin-left: 8px; }
  .exp-company   { font-size: 10pt; color: #475569; margin-top: 1px; font-style: italic; }
  .exp-bullets   { margin: 4px 0 0 16px; padding: 0; font-size: 10pt; color: #334155; line-height: 1.55; }
  .exp-bullets li { margin-bottom: 2px; }

  .edu-entry       { margin-bottom: 8px; }
  .edu-degree      { font-size: 10.5pt; font-weight: 600; color: #0f172a; }
  .edu-institution { font-size: 10pt; color: #475569; margin-top: 1px; }

  .footer {
    margin-top: 18px;
    border-top: 1px solid #e2e8f0;
    padding-top: 8px;
    font-size: 8.5pt;
    color: #94a3b8;
    text-align: center;
  }
</style>
</head>
<body>
<div class="resume">

  <div class="header">
    <div class="name">${esc(displayName)}</div>
    ${displayHeadline ? `<div class="headline">${esc(displayHeadline)}</div>` : ''}
    ${contactLine ? `<div class="contact">${contactLine}</div>` : ''}
  </div>

  ${narrative ? `
  <div class="section">
    <div class="section-title">Professional Summary</div>
    <p class="summary">${esc(narrative).replace(/\n/g, '<br>')}</p>
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

  ${skillsHtml ? `
  <div class="section">
    <div class="section-title">Skills</div>
    ${skillsHtml}
  </div>` : ''}

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
  return name
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { generatePortfolioPdf };
