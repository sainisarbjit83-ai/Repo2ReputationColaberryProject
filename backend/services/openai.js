const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are a technical skill analyzer for a developer portfolio platform.
Analyze the provided GitHub repository metadata and extract technologies, key takeaways, and a professional summary.

Rules:
- Only include technologies clearly evidenced by the provided metadata
- Do not invent or assume skills not evidenced in the data
- Confidence scores must be between 0.0 and 1.0
- Technologies must be specific (e.g. "React" not "Frontend")
- Evidence must quote what in the metadata supports the claim
- confidence_label must be "High" (>=0.8), "Medium" (0.5–0.79), or "Low" (<0.5)
- key_takeaways status must be either "positive" or "warning"

Return ONLY valid JSON with this exact structure:
{
  "summary": "2-3 sentence professional summary of the work demonstrated in this repository.",
  "key_takeaways": [
    { "text": "Uses React 18 with hooks for modern UI patterns", "status": "positive" },
    { "text": "No test files detected", "status": "warning" }
  ],
  "technologies": [
    { "name": "React", "category": "Frontend", "confidence": 0.94, "evidence": "Listed in topics and README" },
    { "name": "Node.js", "category": "Backend", "confidence": 0.88, "evidence": "package.json engine field" }
  ],
  "what_it_does": "A concise 1-2 sentence explanation of what this project actually does from an end-user perspective.",
  "highlights": {
    "purpose": "The main goal or problem this repository solves.",
    "strengths": "The most notable technical strengths visible from the metadata.",
    "use_cases": "Who would use this and in what context.",
    "repository_activity": "Observations about stars, forks, recency, and overall activity level."
  },
  "overall_confidence": 0.87,
  "confidence_label": "High"
}`;

function buildUserPrompt(repo) {
  const topics = Array.isArray(repo.topics)
    ? repo.topics.join(', ')
    : (repo.topics ? JSON.parse(repo.topics).join(', ') : 'None');

  const readme = repo.readme_content
    ? repo.readme_content.slice(0, 2000)
    : 'No README available';

  return `Repository: ${repo.name}
Description: ${repo.description || 'No description provided'}
Primary Language: ${repo.primary_language || 'Unknown'}
Topics/Tags: ${topics || 'None'}
Stars: ${repo.stars_count}
Forks: ${repo.forks_count}

README (first 2000 chars):
${readme}`;
}

async function analyzeRepository(repo) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: buildUserPrompt(repo) },
    ],
    temperature: 0.3,
    max_tokens: 1500,
  });

  const raw = response.choices[0].message.content;
  return JSON.parse(raw);
}

const NARRATIVE_SYSTEM_PROMPT = `You are a technical portfolio writer creating first-person developer portfolio content.

Write exclusively in first person. Never use "This developer...", "The candidate...", or any third-person phrasing.

Each repository in the input includes deep analysis intelligence: Project Hook, Project Narrative, Resume Highlights, Business Domain, and Technical Differentiation. Use this as primary source of truth. Legacy summary text is a fallback only.

Rules:
- headline: one first-person sentence naming what was actually built and the engineering domains it spans (e.g. "I build AI orchestration systems, backend APIs, and full-stack applications using TypeScript, OpenAI, and Node.js.")
- narrative: 3-4 paragraphs in first person: (1) what I build and what problems I solve using concrete project examples, (2) technical depth citing specific technologies and architecture patterns from the data, (3) project-specific highlights drawing from the provided hook sentences and impact statements, (4) what I bring to a team and what I'm looking to work on next
- projects one_liners: use the provided "Project Hook" sentence directly — do NOT write generic technology descriptions
- top_skills: deduplicate across repos, rank by confidence (highest first), max 10
- engineering_strengths: 4-8 specific engineering strengths actually evidenced by the analysis (e.g. "AI Integration", "Backend API Development", "System Architecture", "Database Design") — only include what is clearly present in the data
- career_signals: estimate strength score 1-5 for each applicable domain based on the analysis evidence — only include domains with score >= 2: AI Engineering, Backend Engineering, System Design, Frontend Engineering, DevOps, Security, Data Engineering
- NEVER use: "strong software engineering skills", "demonstrates strong", "passionate about", "solid foundation"
- ALWAYS ground every claim in the provided Project Hooks, Resume Highlights, and Technical Differentiation

Return ONLY valid JSON with this exact structure:
{
  "headline": "First-person headline naming actual domains and technologies built.",
  "narrative": "3-4 paragraph first-person bio grounded in the specific project data provided.",
  "top_skills": [
    { "name": "React", "category": "Frontend", "confidence": 0.94 }
  ],
  "projects": [
    { "repoName": "my-app", "oneLiner": "Use the Project Hook sentence from input when available." }
  ],
  "engineering_strengths": ["AI Integration", "Backend API Development", "System Architecture"],
  "career_signals": [
    { "domain": "AI Engineering", "score": 5 },
    { "domain": "Backend Engineering", "score": 4 }
  ]
}`;

function buildNarrativeUserPrompt(analyses) {
  const lines = s => (Array.isArray(s) ? s : []).map(x => `  - ${x}`).join('\n') || '  - None';

  const sections = analyses.map((a, i) => {
    const intel = a.intelligence;         // deep analysis Phase 5 — may be null
    const pn    = intel?.portfolioNarrative;
    const bv    = intel?.businessValue;
    const res   = intel?.resume;

    // ── Project identity ──────────────────────────────────────────────────────
    const hook = pn?.hookSentence
              || a.whatItDoes
              || a.description
              || 'No description available';

    let section = `Repository ${i + 1}: ${a.repoName}`;
    section += `\nProject Hook: ${hook}`;

    // ── Deep narrative (use intelligence story if available) ──────────────────
    if (pn?.story) {
      section += `\nProject Narrative: ${pn.story}`;
    } else if (a.summary) {
      section += `\nSummary: ${a.summary}`;
    }

    if (pn?.projectImpact) {
      section += `\nProject Impact: ${pn.projectImpact}`;
    }

    // ── Technical differentiation (specific, non-generic signals) ────────────
    if (pn?.technicalDifferentiation?.length > 0) {
      section += `\nTechnical Differentiation:\n${lines(pn.technicalDifferentiation)}`;
    }

    // ── Resume highlights (concrete, ATS-ready bullets) ───────────────────────
    if (res?.bulletPoints?.length > 0) {
      section += `\nResume Highlights:\n${lines(res.bulletPoints)}`;
    }
    if (res?.impactStatements?.length > 0) {
      section += `\nImpact Statements:\n${lines(res.impactStatements)}`;
    }
    if (res?.suggestedTitle) {
      section += `\nSuggested Role Title: ${res.suggestedTitle}`;
    }

    // ── Business value ────────────────────────────────────────────────────────
    if (bv?.probableDomain) {
      section += `\nBusiness Domain: ${bv.probableDomain}`;
    }
    if (bv?.userValue) {
      section += `\nUser Value: ${bv.userValue}`;
    }
    if (bv?.operationalCapabilities?.length > 0) {
      section += `\nOperational Capabilities:\n${lines(bv.operationalCapabilities.slice(0, 5))}`;
    }

    // ── Technologies ──────────────────────────────────────────────────────────
    const techs = (a.technologies || [])
      .map(t => `  - ${t.name} (${t.category}, confidence: ${t.confidence})`)
      .join('\n');
    section += `\nTechnologies:\n${techs || '  - None detected'}`;

    // ── Legacy highlights fallback (only when no deep intelligence) ───────────
    if (!intel && a.highlights?.strengths) {
      section += `\nStrengths: ${a.highlights.strengths}`;
    }

    // ── Inference engine output (Phase 6 cross-phase synthesis) ──────────────
    if (a.inference) {
      const assessment    = a.inference.overallAssessment || {};
      const strengthLines = lines(a.inference.strengths);
      section += `\nDeep Analysis (cross-phase structural evidence):`;
      section += `\n  Engineering level: ${assessment.engineeringLevel || 'unknown'}`;
      section += `\n  Portfolio strength: ${assessment.portfolioStrength || 'unknown'}`;
      section += `\n  Project maturity: ${assessment.projectMaturity || 'unknown'}`;
      section += `\n  Deployment readiness: ${assessment.deploymentReadiness || 'unknown'}`;
      section += `\n  Confidence score: ${a.inference.confidence?.overall ?? 'unknown'}`;
      section += `\n  Confirmed architectural strengths:\n${strengthLines}`;
    }

    return section;
  });

  return sections.join('\n\n---\n\n');
}

async function generatePortfolioNarrative(analyses) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: NARRATIVE_SYSTEM_PROMPT },
      { role: 'user',   content: buildNarrativeUserPrompt(analyses) },
    ],
    temperature: 0.5,
    max_tokens: 2000,
  });

  const raw = response.choices[0].message.content;
  return JSON.parse(raw);
}

const README_SYSTEM_PROMPT = `You are a technical writer creating a professional README.md for a GitHub repository.

Rules:
- Base every claim strictly on the provided analysis data — do not invent features, libraries, or usage steps
- Write in clear, developer-friendly markdown
- If installation or usage details are not in the analysis, write a sensible placeholder with a comment like "<!-- update with actual steps -->"
- Do not add badges, shields.io links, or license sections unless explicitly in the data
- Output raw markdown only — no code fences wrapping the whole document

Structure the README with these sections in order:
# <repo name>
## Overview
## Features
## Tech Stack
## Getting Started
### Prerequisites
### Installation
## Usage
## Contributing`;

function buildReadmeUserPrompt(repo, analysis) {
  const techs = (analysis.technologies || [])
    .map(t => `  - ${t.name} (${t.category}, confidence: ${Math.round(t.confidence * 100)}%)`)
    .join('\n');

  const takeaways = (analysis.key_takeaways || [])
    .map(t => `  - [${t.status}] ${t.text}`)
    .join('\n');

  return `Repository name: ${repo.name}
Primary language: ${repo.primary_language || 'Unknown'}
Topics/tags: ${Array.isArray(repo.topics) ? repo.topics.join(', ') : (repo.topics || 'None')}

What it does: ${analysis.what_it_does || 'Not specified'}
Summary: ${analysis.summary || 'Not specified'}
Purpose: ${analysis.highlights?.purpose || 'Not specified'}
Strengths: ${analysis.highlights?.strengths || 'Not specified'}
Use cases: ${analysis.highlights?.use_cases || 'Not specified'}

Technologies detected:
${techs || '  - None detected'}

Key takeaways:
${takeaways || '  - None'}`;
}

async function generateReadme(repo, analysis) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: README_SYSTEM_PROMPT },
      { role: 'user',   content: buildReadmeUserPrompt(repo, analysis) },
    ],
    temperature: 0.4,
    max_tokens: 1500,
  });

  return response.choices[0].message.content.trim();
}

module.exports = { analyzeRepository, generatePortfolioNarrative, generateReadme };
