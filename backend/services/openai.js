const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are a technical skill analyzer for a developer portfolio platform.
Analyze the provided GitHub repository metadata and extract skills, domains, and a professional summary.

Rules:
- Only include skills clearly evidenced by the provided metadata
- Do not invent or assume skills not evidenced in the data
- Confidence scores must be between 0.0 and 1.0
- Skills must be specific technologies (e.g. "React" not "Frontend")
- Evidence must quote what in the metadata supports the claim

Return ONLY valid JSON with this exact structure:
{
  "skills": [
    { "name": "React", "confidence": 0.94, "evidence": "Listed in package.json dependencies and topics" }
  ],
  "domains": [
    { "name": "Frontend Web Development", "confidence": 0.91 }
  ],
  "summary": "2-3 sentence professional summary of the work demonstrated in this repository.",
  "overall_confidence": 0.87
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
    max_tokens: 1000,
  });

  const raw = response.choices[0].message.content;
  return JSON.parse(raw);
}

module.exports = { analyzeRepository };
