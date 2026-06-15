# PROGRESS.md
**Repo2Reputation — Authoritative Repository Development Ledger**

---

## Project Overview

**Repo2Reputation** is a full-stack SaaS application that converts GitHub repositories into AI-powered recruiter portfolios. It ingests GitHub repos, runs a multi-phase AI analysis pipeline, and produces public portfolio pages, downloadable PDF resumes, and AI-generated README files.

**Target users:** Students and early-career developers at Colaberry who need recruiter-ready portfolios.

**Stack:**
- Frontend: React (Vite), deployed as SPA
- Backend: Node.js / Express, REST API
- Database: PostgreSQL (JSONB-heavy schema)
- AI: OpenAI GPT-4o / GPT-4o-mini
- PDF: Puppeteer (headless Chromium)
- Testing: Vitest (frontend unit tests only)

---

## Repository Phase

**Current Phase: M11 — Active Development (PDF Resume Quality Overhaul — Uncommitted)**

| Layer | Status |
|-------|--------|
| Authentication & User Management | Verified |
| GitHub Repo Import | Verified |
| Basic AI Analysis Pipeline | Verified |
| Deep Analysis Pipeline (6-phase) | Integrated |
| Portfolio Builder | Integrated |
| Public Portfolio Page | Integrated |
| PDF Resume Download | Integrated |
| Recruiter Search | Integrated |
| README Generator | Partially Implemented |
| Directives (`/directives`) | Planned — directory does not exist |
| Execution scripts (`/execution`) | Planned — directory does not exist |
| Tests (`/tests`) | Partially Implemented — frontend utils only |
| CI/CD | Planned — not configured |

---

## Milestone History

### M1 — Project Scaffolding
- Express backend, React frontend with Vite, PostgreSQL connection
- JWT authentication (register/login)
- Basic user model

### M2 — GitHub Integration
- GitHub username linking (`PATCH /api/users/me/github`)
- Repo listing from GitHub API
- Repo import with `import_jobs` tracking table
- README content fetched on import

### M3 — Basic AI Analysis Engine
- `POST /api/analysis/:repositoryId/start` — async job
- OpenAI GPT-4o-mini extracts skills, summary, highlights, key takeaways
- `analyses` table: `skills_json`, `summary_json`, `confidence_score`
- Frontend polling loop in `AnalysisPanel.jsx`

### M4 + M5 — Portfolio System & Recruiter Search
- `portfolios` table with `content_json` JSONB column
- Portfolio Builder UI (multi-step: narrative, profile, LinkedIn import, repo selection, project media, preview)
- Public portfolio URL: `{FRONTEND_URL}/portfolio/:slug`
- `PublicPortfolio.jsx` — public-facing view
- `POST /api/portfolios/:id/pdf` — Puppeteer PDF download
- Recruiter search (`search` route, `RecruiterSearch.jsx`)
- LinkedIn PDF import via OpenAI — extracts name, headline, location, experience, education

### M6 — Deep Analysis Pipeline
Six-phase async pipeline stored in `deep_analyses` table:
1. **GitHub Enrichment** — `githubEnricher.js`
2. **Code Intelligence** — `codeIntelligence.js` → `intelligence_json`
3. **File Classification** — `fileClassification.js`
4. **Semantic Chunking** — `semanticChunking.js`
5. **Intelligence Agents** — `intelligenceAgents.js` → `inference_json`
6. **Inference Engine** — `inferenceEngine.js` → `code_intelligence_json`

New Analysis Panel tabs: Overview (Executive Intelligence Dashboard), Architecture (System Architecture Canvas), Quality (Portfolio Intelligence Overview).

### M7 — AI Project Descriptions & Public Portfolio Overhaul
- `POST /api/repos/:id/generate-description` — per-repo AI project descriptions
- Public portfolio redesign: sidebar layout, Core Technologies, Engineering Skills sections
- README `docs/images/demo.gif` added

### M8 — PDF Overhaul, AI Insights, Smart Media Upload *(committed: 4abc681)*

**Files modified:**
- `backend/routes/portfolios.js` — PDF route reads `profile` + `linkedin` from `content_json`; passes `experience`, `education`, `name` to `pdfGenerator`; GET route exposes `repoMedia`
- `backend/services/pdfGenerator.js` — full HTML overhaul: personal info header (name, email, location, LinkedIn), Experience section, Education section; section order: Summary → Experience → Education → Skills → Projects
- `frontend/src/PublicPortfolio.jsx` — AI Insights sidebar section (green-dot bullets from `repos[].analysis.highlights.strengths`); removed score bars, "Generated from AI" badge, AI confidence badge, Technical Strengths box; renamed "About Me" → "Professional Summary"
- `frontend/src/PortfolioBuilder.jsx` — `MediaInput` component with auto-convert GitHub blob→raw URL, preview image, validation, error states; `handleEditPortfolio` loads and filters `repoMedia` from DB
- `frontend/src/utils/mediaUrl.js` — `githubToRaw()`, `isSupportedMediaUrl()` utilities *(new file)*
- `frontend/src/utils/mediaUrl.test.js` — 20 Vitest unit tests for both utilities *(new file)*
- `frontend/vite.config.js` — Vitest config added (`globals: true`, `environment: 'node'`)
- `backend/package.json` — Puppeteer added as dependency

### M9 — Deep Analysis Integration, Bug Fixes, LinkedIn Navigation *(committed)*

**Files modified:**
- `backend/routes/repos.js` — `generate-readme` gate now passes if either basic OR deep analysis exists; `row` defaults to `{}` to avoid crash on deep-only repos
- `backend/routes/portfolios.js` — narrative route filter changed from `AND a.skills_json IS NOT NULL` → `AND (a.skills_json IS NOT NULL OR da.intelligence_json IS NOT NULL)`, fixing "No completed analyses found" for deep-analysis-only repos; added `code_intelligence_json` to narrative query; mapping falls back to deep analysis fields for `whatItDoes` and `technologies`
- `frontend/src/PublicPortfolio.jsx` — added `ensureHttps()` helper; applied to all 3 LinkedIn href locations (sidebar, Let's Connect button, mobile section) — fixed LinkedIn button not navigating to correct URL
- `frontend/src/PortfolioBuilder.jsx` — `loadRepos()` now checks ONLY deep analysis (`/api/deep-analysis/:id/latest`); repos with only deep analysis now appear correctly in Portfolio Builder

### M10 — Resume PDF Deep Analysis Integration *(committed)*

**Files modified:**
- `backend/services/pdfGenerator.js` — full rewrite integrating deep analysis data:
  - `TECH_CATEGORIES`, `TECH_LABELS`, `PATTERN_LABELS`, `ROLE_MAP` lookup tables added
  - `inferRoleTitle(repos, careerSignals)` — derives role title from career_signals or patternsInferred
  - `aggregateSkills(repos, topSkills)` — collects languages from primaryLanguage, technologies from code_intelligence_json across repos
  - `buildEngineeringSignals(repos)` — patternsInferred → chips, aiFeatures, strengths
  - `buildProjectBlocks(projects, repos)` — arch patterns, impact bullets, tech stack per repo
  - `buildSummary(narrative, repos)` — used hookSentence (project-focused — known limitation, fixed in M11)
- `backend/routes/portfolios.js` — PDF route LEFT JOIN LATERAL on `deep_analyses` for `intelligence_json`, `inference_json`, `code_intelligence_json`; passes `careerSignals` and per-repo deep analysis to pdfGenerator

**Known issues identified after M10 (addressed in M11):**
- `inferRoleTitle()` returned `careerSignals[0]` directly (the object `{ domain, score }`), causing `[object Object]` below candidate name — because `career_signals` stores objects not strings
- `buildSummary()` used `hookSentence` which is repository-focused ("A Express + Prisma-powered API service…") not developer-focused
- `buildProjectBlocks()` sliced before deduplication; limit was 8 instead of 6; arch patterns used raw `split('_')` instead of canonical labels

### M11 — Resume PDF Quality Overhaul *(2026-06-15)*

**Files modified:**
- `backend/services/pdfGenerator.js` — complete rewrite addressing all identified quality issues:

**P0 — Critical bug fixes:**
- `inferRoleTitle()`: now handles `careerSignals` as `[{domain, score}]` objects AND legacy strings; sorts by `.score` descending, extracts `.domain` — fixes `[object Object]` below candidate name
- `buildProjectBlocks()`: deduplicates technologies before slicing (`[...new Set([...techs, ...frameworks])]`), limit reduced to 6; added `CI_ARCH_LABELS` map for human-readable arch pattern labels (e.g., `rest_api` → "RESTful API" instead of "Rest Api")

**P1 — Person-focused Professional Summary:**
- `buildPersonSummary(repos)` replaces `buildSummary()` entirely
- Sentence 1: `"[Level] [Role] with experience building [context from patternsInferred]"`
- Sentence 2: `"Skilled in [top 5 technologies aggregated across all repos]"`
- Sentence 3: `"Demonstrated expertise in [top 3 PATTERN_LABELS signals]"` or first strength
- Derives `engineeringLevel` (`junior/mid/senior`) from `inference.overallAssessment.engineeringLevel`

**P2 — New "Target Role" section:**
- `buildTargetRoleHtml(repos, careerSignals)` added
- Shows Primary Role (from `careerSignals` highest score `.domain`) + Engineering Level (from `engineeringLevel` → "Entry Level"/"Mid-Level"/"Senior")
- Appears after Professional Summary

**P3 — New "Career Highlights" section:**
- `buildCareerHighlightsHtml(repos, experience)` added
- Calculates years of experience from LinkedIn `experience[].startDate` (earliest date to now)
- Maps `patternsInferred` → highlight labels via `HIGHLIGHT_MAP` (AI/LLM Orchestration, RAG Pipeline, Full Stack Development, etc.)
- Appends AI features not already represented
- Shows at most 7 checkmark bullets

**P4 — New lookup table:**
- `CI_ARCH_LABELS` map: 30 code intelligence architecture pattern keys → human-readable labels (covers REST API, JWT auth, ORM, vector databases, LLM orchestration, CI/CD, etc.)

**Section order (updated):** Header → Professional Summary → Target Role → Career Highlights → Engineering Signals → Experience → Education → Technical Skills → Projects → Footer

---

## Uncommitted Changes (Current Session — 2026-06-15)

Changes in this session that have **not been committed yet**:

### `backend/services/pdfGenerator.js` *(M11 — complete rewrite)*
All M11 changes described above. This is the only file changed in this session.

---

## Architecture

```
frontend/src/
  App.jsx                  — routing, auth gate
  AnalysisPanel.jsx        — per-repo analysis UI (Overview, Architecture, Quality, Portfolio Report, README tabs)
  PortfolioBuilder.jsx     — multi-step portfolio creation/editing
  PublicPortfolio.jsx      — public recruiter-facing portfolio page
  RecruiterSearch.jsx      — search UI for recruiters
  Header.jsx               — top navigation
  utils/mediaUrl.js        — GitHub blob→raw URL conversion + media validation
  utils/mediaUrl.test.js   — Vitest unit tests (20 tests)

backend/
  server.js                — Express entry point
  routes/
    auth.js                — register, login, JWT
    users.js               — profile, GitHub username linking
    repos.js               — GitHub repo list/import, generate-readme
    analysis.js            — basic AI analysis (start, poll, results)
    deepAnalysis.js        — deep 6-phase pipeline (start, poll, results)
    portfolios.js          — CRUD, PDF download, public portfolio
    search.js              — recruiter full-text search
  services/
    openai.js              — all OpenAI calls (analysis, portfolio narrative, project descriptions, LinkedIn extract, README generation)
    pdfGenerator.js        — Puppeteer HTML→PDF
    deepAnalysisPipeline.js — orchestrates 6 phases
    githubEnricher.js      — phase 1
    codeIntelligence.js    — phase 2
    fileClassification.js  — phase 3
    semanticChunking.js    — phase 4
    intelligenceAgents.js  — phase 5
    inferenceEngine.js     — phase 6
    repoLimits.js          — repo usage limits
    repoIntelligenceScorer.js — scoring
    phaseTracker.js        — pipeline phase state
  db/
    postgres.js            — pg pool
    seed.js                — seed data
  middleware/
    authMiddleware.js      — JWT verify
```

**Database tables (known):**
- `users` — id, email, github_username, created_at
- `repositories` — id, user_id, provider, external_repo_id, name, full_name, primary_language, topics, readme_content, sync_status
- `import_jobs` — id, user_id, repository_id, status, progress_pct, error_message
- `analyses` — id, repository_id, status, skills_json, summary_json, confidence_score
- `deep_analyses` — id, repository_id, status, intelligence_json, inference_json, code_intelligence_json, completed_at
- `portfolios` — id, user_id, title, slug, headline, content_json (JSONB: narrative, profile, linkedin, repo_media), is_public

---

## Testing Status

| Area | Status | Evidence |
|------|--------|----------|
| `mediaUrl.js` utilities | Tested | 20 Vitest unit tests in `mediaUrl.test.js` |
| Backend routes | Not Tested | No test files exist under `/tests` or `backend/` |
| Deep analysis pipeline | Not Tested | No unit or integration tests |
| PDF generation | Not Tested | Manually verified only |
| OpenAI service functions | Not Tested | No mocks or unit tests |
| Public portfolio rendering | Not Tested | Manual browser verification only |
| Auth flow | Not Tested | No Playwright or integration tests |
| Recruiter search | Not Tested | No tests |

**Gap:** The CLAUDE.md contract requires unit tests for all non-trivial execution logic. Only `mediaUrl.js` satisfies this. All backend services, routes, and the deep analysis pipeline are untested.

---

## Structural Gaps vs CLAUDE.md Contract

| Requirement | Status |
|-------------|--------|
| `/directives` directory with SOPs | Missing — directory does not exist |
| `/execution` directory with deterministic scripts | Missing — logic lives in `/services` |
| `/tests` directory mirroring execution | Missing — tests only in `frontend/src/utils/` |
| CI/CD pipeline | Missing — no `.github/workflows/` |
| One-command test execution documented | Missing |
| Integration tests with opt-in env flag | Missing |
| Playwright / E2E tests | Missing |

---

## Known Risks & Technical Debt

1. **No backend tests** — all AI service calls, route handlers, and the 6-phase pipeline have zero test coverage. A bug in `openai.js` or any pipeline phase has no safety net.
2. **README tab partially implemented** — `AnalysisPanel.jsx` has uncommitted README tab changes but verification has not been completed.
3. **`gpt-4o` cost** — README generation upgraded to `gpt-4o`. At scale this is significantly more expensive than `gpt-4o-mini`. No rate limiting or quota guard exists.
4. **Puppeteer in production** — PDF generation requires Chromium. Deployment environments (e.g., Railway, Render free tier) may not support headless Chrome without custom buildpacks.
5. **No error boundary on deep analysis** — if any phase fails mid-pipeline, partial results are stored but the frontend may render incomplete data without clear user indication.
6. **`content_json` is untyped JSONB** — no schema validation on write. Malformed portfolio saves silently corrupt data.
7. **GitHub token optional** — `GITHUB_TOKEN` is optional in `GITHUB_HEADERS`. Unauthenticated requests hit GitHub's 60 req/hr rate limit, which will break import for active users.

---

## Next Recommended Actions

### Immediate (unblock current work)
1. Verify and commit `AnalysisPanel.jsx` README tab — confirm it renders, Generate button calls the route, Copy and Download work
2. Commit all current session changes (`repos.js`, `openai.js`, `AnalysisPanel.jsx`, `Header.jsx`)
3. Update `PROGRESS.md` after commit

### Short-term (quality & stability)
4. Add backend unit tests for `openai.js` — mock OpenAI, test prompt construction and response parsing
5. Add route integration tests for `generate-readme` — test both basic-only, deep-only, and both-present scenarios
6. Add cost guard on `gpt-4o` README calls — enforce max_tokens cap and consider rate limiting per user
7. Document one-command test run in README (`npm test` from root)

### Medium-term (CLAUDE.md compliance)
8. Create `/directives` directory with SOPs for: analysis pipeline, portfolio generation, README generation, PDF export
9. Extract reusable logic from `/services` into `/execution` scripts per CLAUDE.md layer model
10. Add Playwright E2E tests for: login flow, portfolio creation, public portfolio rendering, PDF download
11. Set up GitHub Actions CI running Vitest on every push

---

## Definition of Done Checklist (per CLAUDE.md)

For each feature to be considered complete:
- [ ] Implementation exists and is not scaffolded
- [ ] Relevant unit tests pass
- [ ] Behavior-changing logic updates directives
- [ ] End-to-end impact verified (manual or automated)
- [ ] No secrets introduced
- [ ] PROGRESS.md updated

---

*Last updated: 2026-06-15 — M11: complete pdfGenerator.js rewrite. Fixes [object Object] role title bug, adds person-focused Professional Summary, Target Role section, Career Highlights section, and CI arch pattern label map. M9/M10 documented retrospectively.*
