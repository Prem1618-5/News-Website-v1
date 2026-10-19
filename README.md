# News App Platform

A modern, production-grade news publishing and reading platform monorepo. Built with a fast public Reader, a robust editorial Newsroom back-office, and a high-performance Python FastAPI Platform API.

---

## 🌟 Overview & Architecture

The repository is structured as a monorepo containing three core applications and shared contracts:

```
├── apps/
│   ├── reader/         # Public news site (React 19 + Vite + Tailwind v4, prerendered to static HTML)
│   ├── newsroom/       # Editorial back-office app (React 19 + TypeScript + Tailwind CSS)
│   └── api/            # Platform backend API (FastAPI + SQLModel + SQLite/Postgres) and article packs (content/)
├── packages/
│   └── contracts/      # Shared schemas, TypeScript contracts & JSON specifications
├── infra/              # Docker Compose & Render deployment manifests
├── scripts/            # Monorepo build and development orchestration scripts
└── vercel.json         # Single-project full-stack Vercel deployment configuration
```

### Key Highlights

- **Public Reader (`apps/reader`)**:
  - Prerendered static HTML for every story, desk and info page, so search engines and AI agents read the full text without running JavaScript. Sitemaps, news sitemap, RSS, `llms.txt` and a Markdown copy of every story are generated at build time. See [SEO.md](SEO.md).
  - English and Hindi stories on their own URLs with hreflang. 13 simple, positive desks (World, Politics, Business, Tech, Sports, Culture, Science, Health, Safety, Justice, Education, Environment, Entertainment) and a Local / State / National / World coverage switch.
  - Save, follow, highlight and search; accounts; cookie consent with Global Privacy Control and a consent ledger.
  - Responsive from 320 px to 2560 px (`pnpm --filter @news/reader audit:responsive`).

- **Newsroom Back-Office (`apps/newsroom`)**:
  - Role-based editorial workflows (**Reporter**, **Editor**, **Admin**).
  - Review queue with claim locks, feedback threads, mistake tagging, and SLA management.
  - Pure TypeScript state machine implementing four-eyes review, supervision tiers, and break-glass privileges.
  - AI writing and editing assistant integration (Groq, NVIDIA NIM, OpenAI-compatible).
  - Editorial analytics, activity timelines, and live audit feed.

- **Platform API (`apps/api`)**:
  - Fast ASGI application built with FastAPI and SQLModel/SQLAlchemy.
  - Local SQLite development storage with PostgreSQL production support (Neon, Supabase, Railway).
  - Session & Bearer token authentication with brute-force rate limiting.
  - ETag-based HTTP caching, cursor pagination, and full-text search endpoints.
  - Privacy and cookie consent ledger endpoints.

---

## 🛠️ Tech Stack

| Area | Technologies |
|---|---|
| **Reader UI** | React 19, TypeScript, Vite, Tailwind CSS v4 (theme only), React Router, SWR, static prerender |
| **Newsroom UI** | React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts |
| **Backend API** | Python 3.11+, FastAPI, SQLModel, SQLAlchemy 2.0, Pydantic v2, Passlib/Bcrypt |
| **Monorepo** | pnpm Workspaces, Node.js |
| **Deployment** | Vercel (Single-Project Monorepo with Python Serverless Function), Docker Compose, Render |

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js** (v18.x or later)
- **pnpm** (v9.x or v10.x / Corepack enabled)
- **Python** (v3.11 or later)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Prem16180/news-app.git
   cd news-app
   ```

2. **Install Node dependencies:**
   ```bash
   pnpm install
   ```

3. **Install Python backend dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
   *(Or install inside a virtual environment for `apps/api` using `pip install -r apps/api/requirements.txt`)*

---

## ⚙️ Environment Configuration

Copy the example environment configuration file to create your local `.env`:

```bash
cp apps/api/.env.example apps/api/.env
```

Key configuration options in `apps/api/.env`:

| Variable | Description | Default |
|---|---|---|
| `APP_ENV` | Application environment (`development` or `production`). Unset means production: no demo accounts, `JWT_SECRET` and `NEWSROOM_API_KEY` required. | `production` |
| `JWT_SECRET` | Secret key for signing staff JWT bearer tokens | *(Dev fallback)* |
| `NEWSROOM_API_KEY` | Shared secret allowing newsroom publish operations | *(Local dev key)* |
| `NEWS_DATABASE_URL` | Database connection string | `sqlite:///data/news.db` |
| `NEWS_CORS_ORIGINS` | JSON list of allowed CORS origins | `[]` |
| `NEWS_DEPLOY_HOOK_URL` | Static host deploy hook, called (debounced) after the Newsroom publishes so the prerendered Reader rebuilds | *(None)* |
| `AI_PROVIDER` | AI provider choice (`groq`, `nvidia`, `openai_compatible`) | *(None)* |
| `GROQ_API_KEY` | Groq API Key (Llama 3.3 70B Versatile) | *(Optional)* |
| `NVIDIA_API_KEY` | NVIDIA NIM API Key | *(Optional)* |

---

## 💻 Running Locally

### All-in-One Development Command

Start the Platform API, Reader, and Newsroom simultaneously with live reload:

```bash
pnpm dev
```

The services will be available at:
- **Reader (Public Site)**: [http://localhost:3000](http://localhost:3000)
- **Newsroom (Staff Desk)**: [http://localhost:5174](http://localhost:5174)
- **Platform API**: [http://localhost:8000](http://localhost:8000)
- **API Interactive Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

### Individual Service Commands

```bash
# Start API only
pnpm dev:api

# Start Reader only
pnpm dev:reader

# Start Newsroom only
pnpm dev:newsroom
```

---

## 📰 Content: article packs

Stories come from bilingual Markdown packs in `apps/api/content/` (one `article.md` per story: English and Hindi headline, standfirst and body, sources). On start the API reads every pack, assigns each story a desk, a coverage area, a slug and a date, and stores it (idempotent; stories published from the Newsroom are never touched).

```bash
python apps/api/app/content_pack.py          # list every story with its desk, coverage and any editor notes to resolve
```

To add a pack, drop its folder into `apps/api/content/` and restart the API (or rebuild the Reader offline). Desk rules live in `apps/api/app/content_pack.py`; the desk list is `packages/contracts/contracts.json` (mirrored in `apps/api/app/taxonomy.py`, with a test that keeps them equal).

## 🚢 Deployment and search visibility

- [DEPLOYMENT.md](DEPLOYMENT.md): recommended hosting (Cloudflare Pages + Railway + Neon, about $5 a month), alternatives, setup order, scaling path, launch checklist.
- [SEO.md](SEO.md): what is built in for search and AI answer engines, and what you still need to do.

## 🧪 Testing & Quality Assurance

```bash
# Run Newsroom and Reader tests
pnpm test

# Run TypeScript typechecks
pnpm typecheck

# Run API test suite
pnpm test:api
```

---

## 📦 Building & Deployment

### Production Monorepo Build

Compile the Reader and Newsroom static bundles:

```bash
pnpm build
```

### Vercel Deployment

This repository is preconfigured for single-project monorepo deployment on Vercel:
- **Reader** is served at the root `/`.
- **Newsroom** is served under `/newsroom/`.
- **API** runs serverless through `api/index.py` at `/api/*`.
- Handled automatically by `scripts/build-vercel.mjs` and `vercel.json`.
- Good for previews. For a commercial launch see [DEPLOYMENT.md](DEPLOYMENT.md): Vercel's free plan is non-commercial, and the serverless API loses its SQLite file between cold starts.

### Docker Compose

For a production-like local environment with PostgreSQL:

```bash
docker compose -f infra/docker-compose.yml up --build
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
