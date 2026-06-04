<div align="center">

# Repo2Reputation

### Transform GitHub repositories into recruiter-ready portfolios using AI-powered repository intelligence.

![Repo2Reputation Workflow](docs/images/repo2reputation-workflow.png)

> AI-powered workflow: GitHub Repository → Deep Analysis → Skill Inference → Portfolio Generation → Recruiter Search

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?style=flat-square&logo=openai&logoColor=white)](https://openai.com)

</div>

---

## The Problem

Students and early-career developers often have strong GitHub profiles but struggle to:

- **Explain technical complexity** — a repository alone doesn't communicate architecture decisions or engineering depth
- **Showcase real skills** — commit history doesn't translate to a recruiter-friendly skill narrative
- **Build professional portfolios** — most tools require manual writing, not derived intelligence from actual code
- **Communicate project value** — what a project does and what engineering it demonstrates are two different things

---

## The Solution

Repo2Reputation reads your GitHub repositories and does the work for you.

```
GitHub Repositories
        ↓
  AI Repository Analysis
  (technology detection, architecture signals, code patterns)
        ↓
  Deep Intelligence Pipeline
  (capabilities, business value, resume impact statements)
        ↓
  Portfolio Generation
  (narrative, headline, project descriptions, skills)
        ↓
  Recruiter-Ready Public Portfolio
  (shareable URL + downloadable PDF resume)
```

---

## Why Repo2Reputation?

Most portfolio builders ask developers to manually write project descriptions and skills.

Repo2Reputation analyzes actual repository code, architecture, technologies, and engineering patterns to generate portfolio content grounded in evidence rather than self-reported skills.

This creates a more accurate and recruiter-friendly representation of a developer's capabilities.

---

## Repository Improvement

Repo2Reputation doesn't just generate portfolios.

The platform identifies:

- Missing README files
- Missing documentation
- Missing project demos
- Weak project descriptions
- Missing architecture explanations

Helping developers improve repositories before generating a portfolio.

---

## What the Platform Generates

✓ Professional Headline
✓ About Me Narrative
✓ Engineering Strengths
✓ Project Descriptions
✓ Public Portfolio
✓ PDF Resume
✓ Recruiter Search Profile

---

## Product Demo

![End-to-end Demo](docs/media/demo.gif)

> [Watch Full Demo Video](docs/media/demo.mp4)

**End-to-end flow:**
GitHub Import → Analysis → Portfolio Builder → Published Portfolio → PDF Resume

---

## Product Screenshots

### Repository Analysis

![Repository Analysis](docs/images/repo-analysis.png)

The AI analysis pipeline inspects each repository and surfaces:

- **Technology detection** — frameworks, languages, and tools with confidence scoring
- **Architecture insights** — patterns inferred from code structure and file organization
- **What it does** — plain-language summary from an end-user perspective
- **Deep intelligence** — business domain, operational capabilities, engineering strengths

---

### Portfolio Builder

![Portfolio Builder](docs/images/portfolio-builder.png)

A structured editor that lets developers review and refine AI-generated content:

- **Headline generation** — professional title derived from repository signals
- **About Me narrative** — first-person summary written from capability signals, not project names
- **Project descriptions** — 2–4 paragraph project overviews drawn from deep analysis data
- **Experience integration** — upload a LinkedIn PDF to auto-extract work history and education
- **Publish controls** — one click to go live with a public URL

---

### Public Portfolio

![Public Portfolio](docs/images/public-portfolio.png)

A clean, recruiter-facing profile that communicates engineering depth at a glance:

- **Skills sidebar** — technologies grouped by category (Frontend, Backend, DevOps, AI, etc.)
- **Project cards** — title, one-line summary, tech chips, and expandable project overview
- **Experience timeline** — work history and education from LinkedIn
- **PDF resume download** — Puppeteer-rendered resume from the same data
- **Shareable URL** — `yoursite.com/portfolio/<slug>`

---

## How It Works

### Stage 1 — Basic Analysis

> Routes: `/api/analysis`  ·  Service: `openai.js`

GPT-4o-mini inspects repository metadata and README content to extract:

| Signal | Description |
|---|---|
| Technology stack | Frameworks, languages, tools with confidence scores |
| What it does | End-user summary in plain language |
| Key takeaways | Positive signals and gaps (e.g. no tests detected) |
| Confidence label | High / Medium / Low based on evidence strength |

---

### Stage 2 — Deep Analysis Pipeline

> Routes: `/api/deep-analysis`  ·  Service: `deepAnalysisPipeline.js`

A multi-phase pipeline that goes beyond metadata:

```
Phase 1 — File Classification + Semantic Chunking
  Classify every file by type. Chunk README and source files for analysis.

Phase 2 — Code Intelligence
  Detect architecture patterns, API design, data models, and code complexity.

Phase 3 — Inference Engine
  Infer engineering capabilities from observed patterns. What can this developer build?

Phase 4 — Intelligence Agents
  Extract business domain, operational capabilities, resume impact statements,
  and portfolio narrative hooks.
```

---

### Stage 3 — Portfolio Generation

> Routes: `/api/portfolios`  ·  Service: `openai.js`

Two separate GPT calls produce the final portfolio content:

**Narrative generation** — produces the About Me section:
- First-person professional narrative (never mentions repo names)
- Professional headline
- Engineering strengths list
- Top skills ranked by evidence weight

**Project description generation** — produces per-project overviews:
- 2–4 prose paragraphs per repository
- Grounded in deep analysis signals only
- Describes architecture, capabilities, and impact

---

## Key Benefits

### For Developers & Students

- Turn a GitHub profile into a professional portfolio in minutes
- Get AI-written project descriptions grounded in your actual code
- Import LinkedIn work history with a single PDF upload
- Download a formatted PDF resume at any time
- Share a public portfolio URL with recruiters

### For Recruiters & Hiring Managers

- Browse a clean portfolio that surfaces engineering depth, not just a list of repos
- Understand technology strengths without reading code
- Search developers by skill, technology stack, or domain
- Evaluate candidates at a glance — one-line project summaries, expandable deep analysis

---

## Example Output

**Input:** A GitHub repository for a TypeScript + Express + OpenAI API service

**Output:**

> **Headline:** AI Application Developer · Full Stack Engineer
>
> **About Me:** An engineer with a strong foundation in backend architecture and AI integration, building production-ready API services that combine structured data pipelines with LLM-powered capabilities. Demonstrated expertise in TypeScript, Express, and OpenAI API consumption across multiple projects spanning enterprise tooling and developer productivity.
>
> **Engineering Strengths:** AI/ML integration using OpenAI · Production infrastructure defined as code · Enterprise-level backend development
>
> **Project Overview (on click):**
> This platform delivers an AI-powered API service designed for enterprise workflow automation, combining a RESTful Express backend with OpenAI integration to process and respond to structured business inputs. The architecture follows a layered service pattern with Sequelize as the ORM layer over PostgreSQL, enabling clean separation between routing, business logic, and data access. Authentication is handled via JWT middleware, ensuring stateless, scalable request verification across all protected endpoints. The system is containerized with Docker and includes environment-specific configuration, making it deployment-ready across cloud and on-premise targets.

---

## System Architecture

![Architecture Diagram](docs/images/architecture-diagram.png)

```
┌─────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)          │
│  LoginForm  RegisterForm  Header  PortfolioBuilder   │
│  PublicPortfolio  RecruiterSearch  AnalysisPanel     │
└──────────────────────┬──────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────┐
│                   Backend (Express 5)                │
│  /api/auth   /api/repos    /api/analysis             │
│  /api/deep-analysis        /api/portfolios           │
│  /api/search               /api/users                │
└─────┬──────────────┬───────────────┬────────────────┘
      │              │               │
┌─────▼─────┐  ┌─────▼──────┐  ┌────▼──────────────┐
│ PostgreSQL │  │  OpenAI    │  │  GitHub API        │
│ (pg pool) │  │  GPT-4o    │  │  (repo enrichment) │
└───────────┘  └────────────┘  └────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite |
| Backend | Node.js, Express 5 |
| Database | PostgreSQL 14+ |
| Migrations | node-pg-migrate |
| AI | OpenAI API (GPT-4o-mini) |
| PDF Generation | Puppeteer |
| PDF Parsing | pdfjs-dist |
| Auth | JWT + bcrypt |
| File Uploads | Multer |

---

## Project Structure

```
Repo2Reputation/
├── backend/
│   ├── db/
│   │   ├── migrations/         # PostgreSQL migrations (node-pg-migrate)
│   │   ├── postgres.js         # DB connection pool
│   │   └── seed.js
│   ├── middleware/
│   │   └── authMiddleware.js   # JWT verification
│   ├── routes/
│   │   ├── auth.js             # Register / login
│   │   ├── users.js            # User profile
│   │   ├── repos.js            # GitHub repo import
│   │   ├── analysis.js         # Basic AI analysis
│   │   ├── deepAnalysis.js     # Deep analysis pipeline
│   │   ├── portfolios.js       # Portfolio CRUD, narrative, PDF
│   │   └── search.js           # Recruiter search
│   ├── services/
│   │   ├── openai.js                 # GPT prompts: analysis, narrative, descriptions
│   │   ├── deepAnalysisPipeline.js   # Multi-phase deep analysis orchestrator
│   │   ├── codeIntelligence.js       # Code-level signal extraction
│   │   ├── inferenceEngine.js        # Pattern and capability inference
│   │   ├── intelligenceAgents.js     # Business value and portfolio signals
│   │   ├── githubEnricher.js         # GitHub API enrichment
│   │   ├── semanticChunking.js       # README / file chunking
│   │   ├── fileClassification.js     # Repo file type classification
│   │   ├── repoIntelligenceScorer.js # Confidence scoring
│   │   ├── phaseTracker.js           # Deep analysis phase progress
│   │   ├── repoLimits.js             # Per-user repo quotas
│   │   └── pdfGenerator.js           # Puppeteer PDF renderer
│   └── server.js
├── frontend/
│   └── src/
│       ├── App.jsx               # Route handling (SPA)
│       ├── Header.jsx            # Authenticated app shell
│       ├── LoginForm.jsx
│       ├── RegisterForm.jsx
│       ├── RepoCard.jsx          # Repository list item
│       ├── AnalysisPanel.jsx     # Analysis status + results view
│       ├── PortfolioBuilder.jsx  # Portfolio editor (narrative, projects, media)
│       ├── PublicPortfolio.jsx   # Public recruiter-facing portfolio page
│       ├── RecruiterSearch.jsx   # Developer search interface
│       ├── ProfileCard.jsx
│       └── api.js                # Authenticated fetch helper + BASE_URL
├── docs/
│   ├── images/
│   │   ├── hero.png
│   │   ├── repo-analysis.png
│   │   ├── portfolio-builder.png
│   │   ├── public-portfolio.png
│   │   └── architecture-diagram.png
│   └── media/
│       ├── demo.gif
│       └── demo.mp4
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- OpenAI API key
- GitHub Personal Access Token

### 1. Clone the repo

```bash
git clone <repo-url>
cd Repo2Reputation_Colaberry_Project
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:

```env
DATABASE_URL=postgres://user:password@localhost:5432/repo2reputation
JWT_SECRET=your_jwt_secret
OPENAI_API_KEY=sk-...
GITHUB_TOKEN=ghp_...
FRONTEND_URL=http://localhost:5173
```

Run database migrations:

```bash
npm run migrate:up
```

Start the backend:

```bash
npm start
# Runs on http://localhost:5000
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Login, returns JWT |
| `GET` | `/api/repos/imported` | List imported repositories |
| `POST` | `/api/repos/import` | Import repos from GitHub |
| `POST` | `/api/analysis/repo/:id` | Run basic AI analysis |
| `POST` | `/api/deep-analysis/:id` | Start deep analysis pipeline |
| `GET` | `/api/deep-analysis/:id/status` | Poll deep analysis progress |
| `POST` | `/api/portfolios` | Create portfolio from repos |
| `POST` | `/api/portfolios/:id/generate-narrative` | AI-generate portfolio narrative |
| `POST` | `/api/portfolios/:id/generate-project-descriptions` | AI-generate per-project overviews |
| `POST` | `/api/portfolios/:id/linkedin-pdf` | Import LinkedIn PDF |
| `PATCH` | `/api/portfolios/:id/publish` | Publish portfolio publicly |
| `GET` | `/api/portfolios/public/:slug` | Public portfolio data (no auth) |
| `GET` | `/api/portfolios/public/:slug/pdf` | Download PDF resume (no auth) |
| `GET` | `/api/search` | Recruiter developer search |

---

## Public URLs

| Page | URL |
|---|---|
| Developer portfolio | `http://localhost:5173/portfolio/<slug>` |
| Recruiter search | `http://localhost:5173/search` |

---

## Database Migrations

```bash
# Apply all pending migrations
npm run migrate:up

# Roll back the last migration
npm run migrate:down

# Create a new migration file
npm run migrate:create <migration-name>
```

---

## Media Assets

Add screenshots and demo files to the `docs/` folder so the README images render correctly:

```
docs/
├── images/
│   ├── hero.png                   # Full-app hero screenshot
│   ├── repo-analysis.png          # Analysis panel screenshot
│   ├── portfolio-builder.png      # Portfolio editor screenshot
│   ├── public-portfolio.png       # Public portfolio page screenshot
│   └── architecture-diagram.png   # System architecture diagram
└── media/
    ├── demo.gif                   # Animated end-to-end demo
    └── demo.mp4                   # Full demo video
```

---

## License

MIT
