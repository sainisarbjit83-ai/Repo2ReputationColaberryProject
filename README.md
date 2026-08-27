<div align="center">

# Repo2Reputation

### Transform GitHub repositories into AI-powered recruiter portfolios — automatically.

![Repo2Reputation Demo](docs/images/demo.gif)

> Connect GitHub → AI analyzes your repos → Portfolio with headline, summary & projects generated instantly

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?style=flat-square&logo=openai&logoColor=white)](https://openai.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

</div>

---

## Table of Contents

- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Key Features](#key-features)
- [How It Works](#how-it-works)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [User Flows](#user-flows)
- [AI Pipeline Detail](#ai-pipeline-detail)
- [Known Limitations](#known-limitations)

---

## The Problem

Students and early-career developers often have strong GitHub profiles but struggle to:

- **Explain technical complexity** — a repository alone doesn't communicate architecture decisions or engineering depth
- **Showcase real skills** — commit history doesn't translate into a recruiter-friendly skill narrative
- **Build professional portfolios** — most tools require manual writing, not intelligence derived from actual code
- **Communicate project value** — what a project *does* and what engineering it *demonstrates* are two different things

---

## The Solution

Repo2Reputation connects to your GitHub, runs a multi-phase AI analysis pipeline on your repositories, and automatically generates a recruiter-ready portfolio — complete with professional headline, personal summary, skill matrix, project descriptions, and a downloadable PDF resume.

```
GitHub Repositories (public or private, multiple accounts)
        ↓
  6-Phase Deep AI Analysis
  (technology detection · architecture patterns · business value · capabilities)
        ↓
  Portfolio Generation
  (AI writes headline + professional summary + project descriptions)
        ↓
  Recruiter-Ready Portfolio
  (shareable public URL + downloadable PDF resume)
```

No manual writing required. Everything is grounded in evidence from your actual code.

---

## Key Features

### For Developers

| Feature | Description |
|---|---|
| **GitHub OAuth Login** | Sign in with any GitHub account — public or private repos accessible |
| **Multi-Account Support** | Connect additional GitHub accounts (personal + org); repos from all accounts appear in one place |
| **Auto-Import on Connect** | When a new account is connected, top 10 repos are automatically imported and analyzed |
| **AI Deep Analysis** | 6-phase background pipeline: file classification → code intelligence → semantic chunking → inference → business value → portfolio signals |
| **Portfolio Builder** | AI generates your professional headline and summary from repo analysis — no manual writing |
| **LinkedIn PDF Import** | Upload your LinkedIn PDF to auto-fill name, headline, location, email, experience, and skills |
| **README Media Auto-Detection** | Project images and GIFs are automatically extracted from each repo's README |
| **Public Portfolio URL** | One click to publish a shareable profile at `/portfolio/<slug>` |
| **PDF Resume Download** | Puppeteer-rendered resume from the same data, downloadable by anyone |
| **Regenerate Any Time** | Re-run AI generation after adding repos or uploading LinkedIn data |

### For Recruiters

| Feature | Description |
|---|---|
| **Developer Search** | Search by skill, technology, or domain across all public portfolios |
| **Engineering Depth** | Portfolio surfaces architecture signals, not just a repo list |
| **Always-Visible Summary** | First paragraph of project description always shown; click to expand full analysis |
| **Skills by Category** | Technologies grouped into Frontend, Backend, AI, DevOps, Database — scannable at a glance |
| **PDF Resume** | One-click download of a formatted resume for any public portfolio |

---

## How It Works

### Stage 1 — GitHub Import

The user browses their GitHub repos (fetched from all connected accounts), selects which ones to import, and clicks Import. The backend:

1. Fetches repo metadata from GitHub API using the account's stored OAuth token
2. Stores repo in the `repositories` table (name, description, language, topics, README content)
3. Immediately queues a **Deep Analysis** job for each imported repo

### Stage 2 — 6-Phase Deep AI Analysis

Runs automatically in the background after import. No user action required.

```
Phase 1 — GitHub Enrichment
  Enrich repo metadata from GitHub API (languages breakdown, contributor stats, recent commits)

Phase 2 — Code Intelligence
  Detect architecture patterns (REST API, ORM, JWT auth, LLM orchestration, CI/CD, etc.)
  Output: code_intelligence_json → technologies[], patterns_inferred[]

Phase 3 — File Classification
  Classify every file in the repo by type (source, config, test, docs, infra)
  Output: file classification map

Phase 4 — Semantic Chunking
  Split README and key source files into meaningful chunks for GPT analysis

Phase 5 — Intelligence Agents
  Extract: business domain · operational capabilities · resume impact statements
  Output: intelligence_json → businessValue, resume, portfolioNarrative

Phase 6 — Inference Engine
  Synthesize all signals into: engineering strengths · career signals · suggested role · overall assessment
  Output: inference_json → strengths[], careerSignals[], suggestedTitle, engineeringLevel
```

Each phase's status and errors are tracked in `deep_analyses.phase_errors_json`. Failed phases can be retried individually from the UI.

### Stage 3 — Portfolio Generation

When the user clicks **"Generate AI Portfolio"** in the Portfolio Builder:

1. Backend collects all deep analysis data for the selected repos
2. Builds a structured developer capability profile (technologies, strengths, domains, role signals)
3. **Code-level full-stack detection** — if both a frontend framework (React, Vue) AND a backend framework (Node.js, Express) AND a database are detected, the prompt is injected with a MANDATORY FULL-STACK override so the headline accurately reflects the scope
4. Two GPT calls run:
   - **Narrative generation** → professional headline + About Me paragraph + engineering strengths + top skills
   - **Project descriptions** (on demand) → 2–4 paragraph overviews per repo, grounded in deep analysis data
5. Results are saved to `portfolios.content_json` and polled from the frontend every 3 seconds

### Stage 4 — Publish

The user reviews and edits the AI-generated headline and summary in the Portfolio Builder editor, then clicks **Publish** to make the portfolio public at a unique slug URL.

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                    │
│                                                              │
│  Header.jsx          — Browse repos, account management      │
│  PortfolioBuilder.jsx — Multi-step portfolio editor          │
│  PublicPortfolio.jsx  — Recruiter-facing public page         │
│  AnalysisPanel.jsx    — Analysis status + results per repo   │
│  RecruiterSearch.jsx  — Developer search interface           │
│  Settings.jsx         — Connected accounts management        │
└──────────────────────────┬───────────────────────────────────┘
                           │ REST API (JWT auth)
┌──────────────────────────▼───────────────────────────────────┐
│                    Backend (Node.js + Express)                │
│                                                              │
│  /api/auth              — GitHub OAuth login + connect       │
│  /api/repos             — Import, list, delete repos         │
│  /api/github-accounts   — Connected account management       │
│  /api/analysis          — Basic AI analysis                  │
│  /api/deep-analysis     — 6-phase deep analysis pipeline     │
│  /api/portfolios        — Portfolio CRUD + narrative + PDF   │
│  /api/search            — Recruiter search                   │
│  /api/users             — User profile                       │
└───────┬───────────────────┬──────────────────────────────────┘
        │                   │
┌───────▼──────┐    ┌───────▼─────────────────────────────────┐
│  PostgreSQL  │    │  External Services                       │
│              │    │                                          │
│  users       │    │  OpenAI API (GPT-4o / GPT-4o-mini)      │
│  repositories│    │  GitHub API (repos, metadata, OAuth)     │
│  analyses    │    │  Puppeteer (PDF rendering)               │
│  deep_analyses│   │  pdfjs-dist (LinkedIn PDF parsing)       │
│  portfolios  │    └─────────────────────────────────────────┘
│  github_     │
│   accounts   │
└──────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 19 + Vite | SPA, portfolio editor, public portfolio page |
| Backend | Node.js + Express 5 | REST API, analysis orchestration |
| Database | PostgreSQL 14+ | Repos, analyses, portfolios (JSONB-heavy) |
| Migrations | node-pg-migrate | Schema versioning |
| AI | OpenAI GPT-4o / GPT-4o-mini | Analysis, narrative, project descriptions, LinkedIn extraction |
| Auth | GitHub OAuth 2.0 + JWT | Login + multi-account connect |
| GitHub API | Octokit / REST | Repo listing, README fetch, metadata enrichment |
| PDF Generation | Puppeteer | Headless Chromium → PDF resume |
| PDF Parsing | pdfjs-dist | LinkedIn PDF text extraction |
| File Uploads | Multer | LinkedIn PDF upload (in-memory) |
| Testing | Vitest | Frontend utility unit tests |

---

## Project Structure

```
Repo2Reputation/
├── backend/
│   ├── db/
│   │   ├── migrations/               # PostgreSQL migrations (node-pg-migrate)
│   │   ├── postgres.js               # pg connection pool
│   │   └── seed.js                   # Seed data
│   ├── middleware/
│   │   └── authMiddleware.js         # JWT verification middleware
│   ├── routes/
│   │   ├── auth.js                   # GitHub OAuth: /github, /github/callback, /github/connect
│   │   ├── users.js                  # GET /api/users/me
│   │   ├── repos.js                  # Import, list, delete, auto-import-account
│   │   ├── githubAccounts.js         # Connected OAuth accounts CRUD
│   │   ├── analysis.js               # Basic AI analysis (start, poll)
│   │   ├── deepAnalysis.js           # Deep analysis: run, poll, cancel, restart
│   │   ├── portfolios.js             # Portfolio CRUD, narrative, PDF, LinkedIn, media
│   │   └── search.js                 # Full-text recruiter search
│   ├── services/
│   │   ├── openai.js                 # All GPT prompts: analysis · narrative · descriptions · LinkedIn
│   │   ├── deepAnalysisPipeline.js   # 6-phase deep analysis orchestrator
│   │   ├── deepAnalysisQueue.js      # Background queue for deep analysis jobs
│   │   ├── analysisQueue.js          # Background queue for basic analysis jobs
│   │   ├── githubEnricher.js         # Phase 1: GitHub API enrichment
│   │   ├── codeIntelligence.js       # Phase 2: Architecture pattern detection
│   │   ├── fileClassification.js     # Phase 3: File type classification
│   │   ├── semanticChunking.js       # Phase 4: README/source chunking
│   │   ├── intelligenceAgents.js     # Phase 5: Business value + portfolio signals
│   │   ├── inferenceEngine.js        # Phase 6: Capability synthesis + role inference
│   │   ├── pdfGenerator.js           # Puppeteer PDF renderer (resume)
│   │   ├── repoIntelligenceScorer.js # Analysis confidence scoring
│   │   ├── phaseTracker.js           # Deep analysis phase progress tracking
│   │   ├── repoLimits.js             # Per-user repo quotas
│   │   └── techMaps.js               # Technology category + label lookup tables
│   └── server.js                     # Express entry point, route mounting
├── frontend/
│   └── src/
│       ├── App.jsx                   # Routing, auth gate, tab state
│       ├── Header.jsx                # App shell, Browse tab, account management
│       ├── PortfolioBuilder.jsx      # Portfolio editor: repo select → generate → edit → publish
│       ├── PublicPortfolio.jsx       # Public recruiter-facing portfolio page
│       ├── AnalysisPanel.jsx         # Per-repo analysis dashboard (Overview, Architecture, Quality)
│       ├── RecruiterSearch.jsx       # Developer search interface
│       ├── Settings.jsx              # Connected GitHub accounts
│       ├── AuthCallback.jsx          # Handles /auth/callback?token= after OAuth
│       ├── LoginForm.jsx             # GitHub OAuth login button
│       ├── Skeleton.jsx              # Loading skeletons
│       ├── api.js                    # authFetch helper + BASE_URL
│       └── utils/
│           ├── mediaUrl.js           # GitHub blob → raw URL conversion + media validation
│           └── mediaUrl.test.js      # Vitest unit tests (20 tests)
├── docs/
│   └── images/                       # Demo GIFs and screenshots
├── PROGRESS.md                       # Development ledger and milestone history
├── CLAUDE.md                         # AI agent operating rules for this repo
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- An OpenAI API key
- A GitHub OAuth App (for user login)
- A GitHub personal access token (optional — for GitHub API enrichment)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/Repo2Reputation.git
cd Repo2Reputation
```

### 2. Create a GitHub OAuth App

1. Go to **github.com → Settings → Developer settings → OAuth Apps → New OAuth App**
2. Fill in:
   - **Homepage URL:** `http://localhost:5173`
   - **Authorization callback URL:** `http://localhost:5000/api/auth/github/callback`
3. Copy the **Client ID** and generate a **Client Secret**

### 3. Set up the database

```bash
createdb repo2reputation
```

### 4. Backend setup

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
# ── Database ──────────────────────────────────────────────────
DATABASE_URL=postgres://your_user:your_password@localhost:5432/repo2reputation

# ── Server ────────────────────────────────────────────────────
PORT=5000

# ── Auth ──────────────────────────────────────────────────────
JWT_SECRET=any_long_random_string_here

# ── GitHub OAuth (required — for user login) ──────────────────
GITHUB_CLIENT_ID=your_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_oauth_app_client_secret

# ── GitHub API Token (optional — improves enrichment rate limits) ──
# Generate at github.com/settings/tokens → classic → repo scope
GITHUB_TOKEN=ghp_...

# ── OpenAI (required — for all AI features) ───────────────────
OPENAI_API_KEY=sk-...

# ── URLs ──────────────────────────────────────────────────────
FRONTEND_URL=http://localhost:5173
```

Run migrations and start the backend:

```bash
npm run migrate:up
npm start
# → http://localhost:5000
```

### 5. Frontend setup

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### 6. First run

1. Open `http://localhost:5173`
2. Click **Sign in with GitHub**
3. After OAuth, you land on the **Browse GitHub Repos** tab
4. Select repos → click **Import**
5. Deep analysis starts automatically — wait 1–2 minutes per repo
6. Go to **Portfolio** tab → click **✨ Generate AI Portfolio**
7. Review the AI-generated headline and summary → click **Publish**

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `PORT` | No | Backend port (default: 5000) |
| `JWT_SECRET` | Yes | Secret for signing JWT tokens |
| `GITHUB_CLIENT_ID` | Yes | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | Yes | GitHub OAuth App client secret |
| `GITHUB_TOKEN` | Recommended | GitHub PAT for API enrichment (classic, `repo` scope). Without this, GitHub API rate limits to 60 req/hr which breaks enrichment for active users. Rotate when expired — expiry causes 401 errors in deep analysis. |
| `OPENAI_API_KEY` | Yes | OpenAI API key for all AI features |
| `FRONTEND_URL` | Yes | Frontend origin used for OAuth redirects and CORS |

---

## API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/auth/github` | — | Initiate GitHub OAuth login |
| `GET` | `/api/auth/github/callback` | — | OAuth callback — sets JWT, redirects to frontend |
| `GET` | `/api/auth/github?mode=connect&token=JWT` | JWT (query) | Connect a secondary GitHub account via OAuth |
| `POST` | `/api/auth/logout` | JWT | Revoke GitHub token + invalidate session |

### Users

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/users/me` | JWT | Current user profile (username, avatar, email) |

### Repositories

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/repos` | JWT | List all repos from all connected accounts |
| `GET` | `/api/repos/imported` | JWT | List imported repos with analysis status and README media URL |
| `POST` | `/api/repos/import` | JWT | Import selected repos into the database |
| `POST` | `/api/repos/auto-import-account` | JWT | Discover and return top 10 non-fork repos for a connected account |
| `DELETE` | `/api/repos/:id` | JWT | Delete a repo and all its analysis data |

### Connected GitHub Accounts

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/github-accounts` | JWT | List connected OAuth accounts |
| `DELETE` | `/api/github-accounts/:id` | JWT | Disconnect a secondary account |

### Analysis

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/analysis/repo/:id` | JWT | Run basic AI analysis on a repo |
| `GET` | `/api/analysis/repo/:id` | JWT | Get basic analysis results |

### Deep Analysis

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/deep-analysis/run` | JWT | Queue deep analysis for a repo |
| `GET` | `/api/deep-analysis/:id/latest` | JWT | Poll latest deep analysis status and results |
| `POST` | `/api/deep-analysis/cancel-pending` | JWT | Cancel all queued/running analyses |

### Portfolios

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/portfolios` | JWT | Create a new portfolio from selected repo IDs |
| `GET` | `/api/portfolios/:id` | JWT | Load a saved portfolio (narrative, profile, linkedin, media) |
| `PATCH` | `/api/portfolios/:id` | JWT | Save edits (headline, narrative, projects, profile, skills) |
| `POST` | `/api/portfolios/:id/generate-narrative` | JWT | Trigger AI narrative generation (async — poll portfolio GET) |
| `POST` | `/api/portfolios/:id/generate-project-descriptions` | JWT | Generate 2–4 paragraph descriptions for each project |
| `PATCH` | `/api/portfolios/:id/publish` | JWT | Make portfolio publicly visible |
| `PATCH` | `/api/portfolios/:id/media` | JWT | Save project media (GIF/image URLs) |
| `POST` | `/api/portfolios/:id/linkedin-pdf` | JWT | Upload + parse LinkedIn PDF, save to portfolio |
| `POST` | `/api/portfolios/extract-linkedin` | JWT | Parse LinkedIn PDF without saving (preview mode) |
| `GET` | `/api/portfolios/public/:slug` | — | Public portfolio data (no auth required) |
| `GET` | `/api/portfolios/public/:slug/pdf` | — | Download PDF resume (no auth required) |

### Search

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/search?q=react` | — | Search public portfolios by skill/technology |

---

## Database Schema

### `users`
| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `github_user_id` | TEXT | GitHub user ID (unique) |
| `github_username` | TEXT | Primary GitHub username |
| `github_email` | TEXT | GitHub email |
| `github_access_token` | TEXT | OAuth access token for primary account |
| `avatar_url` | TEXT | GitHub avatar URL |
| `created_at` | TIMESTAMPTZ | Account created |

### `github_accounts`
| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → users |
| `github_user_id` | TEXT | GitHub user ID (unique per account) |
| `github_username` | TEXT | GitHub username for this account |
| `access_token` | TEXT | OAuth token for this account |
| `avatar_url` | TEXT | Avatar URL |
| `is_primary` | BOOLEAN | True for the main login account |
| `connected_at` | TIMESTAMPTZ | When this account was connected |

### `repositories`
| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → users |
| `github_account_id` | UUID | FK → github_accounts (which account owns this repo) |
| `name` | TEXT | Repo name |
| `full_name` | TEXT | `owner/repo` |
| `description` | TEXT | GitHub description |
| `primary_language` | TEXT | Main language |
| `topics` | JSONB | GitHub topics array |
| `readme_content` | TEXT | README markdown content (fetched at import) |
| `stars_count` | INT | Stars |
| `forks_count` | INT | Forks |
| `sync_status` | TEXT | `pending`, `imported` |
| `imported_at` | TIMESTAMPTZ | When imported |

### `analyses`
| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `repository_id` | UUID | FK → repositories |
| `status` | TEXT | `pending`, `running`, `completed`, `failed` |
| `skills_json` | JSONB | Technologies with confidence scores |
| `summary_json` | JSONB | What it does, key takeaways, highlights |
| `confidence_score` | FLOAT | Overall analysis confidence (0–1) |

### `deep_analyses`
| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `repository_id` | UUID | FK → repositories |
| `status` | TEXT | `pending`, `queued`, `running`, `completed`, `partial`, `failed`, `cancelled` |
| `intelligence_json` | JSONB | Phase 5 output: business value, resume signals, portfolio narrative hooks |
| `inference_json` | JSONB | Phase 6 output: strengths, career signals, suggested role, engineering level |
| `code_intelligence_json` | JSONB | Phase 2 output: technologies[], patterns_inferred[] |
| `phase_errors_json` | JSONB | Per-phase error details (useful for diagnosing 401s from expired tokens) |
| `confidence_score` | FLOAT | Pipeline confidence |
| `completed_at` | TIMESTAMPTZ | When analysis finished |

### `portfolios`
| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → users |
| `title` | TEXT | Portfolio title |
| `slug` | TEXT | URL slug (unique) |
| `status` | TEXT | `draft`, `published` |
| `visibility` | TEXT | `private`, `public` |
| `content_json` | JSONB | All portfolio data: narrative, profile, linkedin, repo_media, narrative_status, repository_ids |
| `published_at` | TIMESTAMPTZ | When published |

**`content_json` structure:**
```json
{
  "repository_ids": ["uuid1", "uuid2"],
  "narrative_status": "completed",
  "narrative": {
    "headline": "AI Full-Stack Engineer | Web Applications & Business Intelligence",
    "narrative": "I am a ...",
    "top_skills": [{ "name": "React", "category": "Frontend", "confidence": 0.94 }],
    "projects": [{ "repoName": "my-app", "oneLiner": "...", "description": "..." }],
    "engineering_strengths": ["AI Integration", "Full-Stack Architecture"],
    "career_signals": [{ "domain": "AI Engineering", "score": 5 }]
  },
  "profile": {
    "fullName": "Jane Smith",
    "headline": "AI Engineer",
    "photoUrl": "data:image/jpeg;base64,...",
    "location": "Toronto, Canada",
    "email": "jane@email.com",
    "githubUrl": "https://github.com/janesmith",
    "linkedinUrl": "https://linkedin.com/in/janesmith"
  },
  "linkedin": {
    "name": "Jane Smith",
    "headline": "AI Engineer | OpenAI",
    "experience": [{ "role": "...", "company": "...", "startDate": "Jan 2022", "endDate": "Present" }],
    "education": [...],
    "skills": ["Python", "React", "OpenAI"]
  },
  "repo_media": {
    "uuid-of-repo": { "gifUrl": "https://raw.githubusercontent.com/..." }
  }
}
```

---

## User Flows

### New User Flow

```
1. Visit app → click "Sign in with GitHub"
2. GitHub OAuth → redirect back with JWT
3. Top 10 repos auto-imported from primary account
4. Deep analysis starts automatically in background (1–2 min per repo)
5. Portfolio tab opens automatically → AI generates portfolio
6. Review headline + summary → click Publish
7. Share public URL with recruiters
```

### Connect Private Account Flow

```
1. Browse tab → click "Connect Private Account" button
2. GitHub OAuth with mode=connect (second GitHub account)
3. Redirect back to app with ?connected=username
4. Auto-import: top 10 non-fork repos fetched using OAuth token
5. Deep analysis queued for all discovered repos
6. Repos appear in Browse tab with "Analyzing..." badges
```

### Portfolio Generation Flow

```
1. Portfolio tab → all analyzed repos pre-selected automatically
2. Click "✨ Generate AI Portfolio"
3. Backend creates portfolio record with selected repo IDs
4. AI narrative generation starts (async, ~20–30 seconds)
5. Frontend polls every 3s until narrative_status = "completed"
6. Editor opens with pre-filled:
   - Headline (AI Generated — from repo analysis)
   - Professional Summary (AI Generated)
   - Top Skills (merged from repos + LinkedIn)
   - Project one-liners (from deep analysis hook sentences)
   - Project media (auto-detected from README images)
7. Upload LinkedIn PDF to merge experience + education (optional)
8. Edit any field → Save Changes → Publish
```

### LinkedIn PDF Import Flow

```
1. In Portfolio editor → Section 1 "Import from LinkedIn PDF"
2. Export PDF from LinkedIn: Profile → More → Save to PDF
3. Upload PDF → backend parses with pdfjs-dist → GPT extracts structured data
4. Auto-fills: name, headline, location, email, LinkedIn URL
5. Experience + education saved to content_json.linkedin
6. Skills from LinkedIn merged with AI-detected repo skills (deduplicated)
7. LinkedIn headline used as optional override signal for AI narrative
```

---

## AI Pipeline Detail

### Headline Accuracy — How the Role Is Determined

The headline generation uses a 3-step logic applied **before** GPT sees any role signals:

**Step 1 — Engineering Scope Detection (code-level, not GPT):**
```
If Core Technologies includes React/Vue/Angular AND Node.js/Express/FastAPI AND a database
  → MANDATORY: headline must say "Full-Stack"

If AI tools present (OpenAI, LangChain, Anthropic)
  → Prefix with "AI" → "AI Full-Stack Engineer"

If data tools present (Power BI, Microsoft Fabric, Tableau, DAX)
  → Add analytics context to subtitle
```

**Step 2 — Domain Specialization (from deep analysis):**
```
Business Domain signals → subtitle content
Career Signals (AI Engineering, Data Engineering, Backend, Frontend, DevOps)
→ scored 1–5; only signals with score ≥ 2 included
```

**Step 3 — Format:**
```
[Seniority] [Role] | [Domain] & [Domain]

Examples:
  "AI Full-Stack Engineer | Web Applications & Business Intelligence"
  "Data Analyst | Power BI, Python & Business Intelligence"
  "Backend Engineer | APIs, Microservices & Cloud Infrastructure"
```

### Narrative Quality Controls

The AI narrative is constrained by these rules:
- **150–250 words** — hard cap enforced in the prompt
- **First-person only** — never "This developer…" or "The candidate…"
- **No repo names** — every repo name is scrubbed from deep analysis data before the prompt is built
- **No project walkthroughs** — summarizes capabilities across all work, not per-project
- **Prohibited jargon** — "semantic boundaries", "polyglot stack", "inference engine", "confidence score", "pipeline phase" are blocked
- **Regenerate** — user can always click ↺ Regenerate to get a fresh AI generation

---

## Running Tests

```bash
cd frontend
npm run test
```

Currently covers `src/utils/mediaUrl.js` — GitHub URL conversion and media validation (20 Vitest unit tests).

---

## Known Limitations

| Area | Limitation |
|---|---|
| **GITHUB_TOKEN expiry** | The server-side GitHub token used for API enrichment (Phase 1) expires. When it does, deep analysis fails with a 401 in `phase_errors_json`. Fix: generate a new classic PAT at `github.com/settings/tokens` and update `.env`. |
| **README media detection** | Auto-detects only images in standard markdown (`![alt](url)`) and HTML `<img>` tags. Repos with no README or no images in the README will show empty media fields. |
| **Puppeteer in some cloud environments** | PDF generation requires headless Chromium. Some hosting platforms (Render free tier, Railway) may need a custom buildpack or Chromium layer. |
| **No backend test coverage** | All AI service calls, route handlers, and the deep analysis pipeline have zero automated test coverage. |
| **Single portfolio per user** | The UI creates a new portfolio on each "Generate" click. Returning users start fresh unless they use "Edit Portfolio" from the published page. |
| **Private repo README** | If a private repo's README wasn't fetched at import time (OAuth token issue), `readme_content` will be null and no media can be auto-detected. Re-importing the repo will attempt to fetch it again. |

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
Built for <strong>Colaberry</strong> — helping students turn code into careers.
</div>
