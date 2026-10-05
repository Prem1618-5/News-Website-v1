# News App Platform

A modern, production-grade news publishing and reading platform monorepo. Built with a fast public Reader, a robust editorial Newsroom back-office, and a high-performance Python FastAPI Platform API.

---

## 🌟 Overview & Architecture

The repository is structured as a monorepo containing three core applications and shared contracts:

```
├── apps/
│   ├── reader/         # Public news reader website (Vite + Modern Vanilla JS/CSS)
│   ├── newsroom/       # Editorial back-office app (React 19 + TypeScript + Tailwind CSS)
│   └── api/            # Platform backend API (FastAPI + SQLModel + SQLite/Postgres)
├── packages/
│   └── contracts/      # Shared schemas, TypeScript contracts & JSON specifications
├── infra/              # Docker Compose & Render deployment manifests
├── scripts/            # Monorepo build and development orchestration scripts
├── public/             # Static public assets, icons, and fallbacks
└── vercel.json         # Single-project full-stack Vercel deployment configuration
```

### Key Highlights

- **Public Reader (`apps/reader`)**:
  - Blazing-fast reader experience with clean typography and responsive design tokens.
  - Multi-language support and dynamic category filtering.
  - Granular cookie consent management and privacy ledger integration.
  - Optimized for low latency with edge caching and static asset preloading.

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
| **Reader UI** | Vite, Vanilla JavaScript (ES Modules), Custom CSS Design Tokens |
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
| `APP_ENV` | Application environment (`development` or `production`) | `development` |
| `JWT_SECRET` | Secret key for signing staff JWT bearer tokens | *(Dev fallback)* |
| `NEWSROOM_API_KEY` | Shared secret allowing newsroom publish operations | *(Local dev key)* |
| `NEWS_DATABASE_URL` | Database connection string | `sqlite:///data/news.db` |
| `NEWS_CORS_ORIGINS` | JSON list of allowed CORS origins | `[]` |
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

## 🧪 Testing & Quality Assurance

```bash
# Run Newsroom domain and workflow tests
pnpm test

# Run TypeScript typechecks
pnpm typecheck

# Run API test suite
pytest apps/api/tests
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

### Docker Compose

For a production-like local environment with PostgreSQL:

```bash
docker compose -f infra/docker-compose.yml up --build
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
