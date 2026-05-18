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

const NARRATIVE_SYSTEM_PROMPT = `You are a professional technical writer creating recruiter-facing portfolio narratives for software developers.

Given evidence from one or more GitHub repository analyses, write a compelling professional narrative grounded strictly in the provided data.

Rules:
- Write in third person (e.g. "This developer...")
- Only reference technologies and projects explicitly listed in the evidence
- Do not invent skills, experience, or claims not present in the data
- top_skills must be deduplicated across all repos and ranked by confidence (highest first), max 10
- Each project one_liner must describe what the repo actually does, not just its tech stack
- narrative must be 3–4 paragraphs: opening strength summary, technical depth, project highlights, closing value statement

Return ONLY valid JSON with this exact structure:
{
  "headline": "One sentence that captures this developer's core identity and top strengths.",
  "narrative": "3–4 paragraph professional bio written in third person.",
  "top_skills": [
    { "name": "React", "category": "Frontend", "confidence": 0.94 }
  ],
  "projects": [
    { "repoName": "my-app", "oneLiner": "A REST API for managing..." }
  ]
}`;

function buildNarrativeUserPrompt(analyses) {
  const sections = analyses.map((a, i) => {
    const techs = (a.technologies || [])
      .map(t => `  - ${t.name} (${t.category}, confidence: ${t.confidence})`)
      .join('\n');

    return `Repository ${i + 1}: ${a.repoName}
Description: ${a.description || 'No description'}
What it does: ${a.whatItDoes || 'Not specified'}
Summary: ${a.summary || 'Not specified'}
Technologies:
${techs || '  - None detected'}
Strengths: ${a.highlights?.strengths || 'Not specified'}`;
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

module.exports = { analyzeRepository, generatePortfolioNarrative };
