---
name: verify
description: Run and drive apps/api and apps/newsroom locally to verify behaviour.
---

# Verify recipe

- API: `cd apps/api && python -m uvicorn app.main:app --port 8000` (APP_ENV unset = dev; seeds demo staff, see docs/DEMO_CREDENTIALS.md). Health `/api/health`, docs `/api/docs`. Writes gitignored `data/news.db`.
- Newsroom: `cd apps/newsroom && npx vite --port 5174` then open `http://localhost:5174/newsroom/?demo=1` (base path is `/newsroom/`; proxies `/api` to :8000).
- Demo workspace: the "Viewing as" select is a native combobox (use form_input with `reporter|editor|admin`). Full page navigation resets state and drops `?demo=1`; use sidebar links instead.
- Dev API is open: `require_newsroom` passes with no auth, so `POST /api/newsroom/articles` publishes publicly; delete test stories afterwards (`DELETE /api/newsroom/articles/<id>`; stories get id `nr-<id>`).
- Stop servers when done (uvicorn :8000, vite :5174).
