---
name: verify
description: Run and drive apps/api and apps/newsroom locally to verify behaviour.
---

# Verify recipe

- API: `cd apps/api && APP_ENV=development python -m uvicorn app.main:app --port 8000`. An unset APP_ENV means production (needs JWT_SECRET and NEWSROOM_API_KEY). Point `NEWS_DATABASE_URL` and `NEWS_MEDIA_DIR` at a scratch folder to keep test data out of `apps/api/data`. Development seeds staff: jane (admin), mary (editor), alice and anthony (reporters of mary), password `Newsroom#2026`, emails `<first>.<last>@newsapp.example`.
- Newsroom: `cd apps/newsroom && npx vite --port 5174` then open `http://localhost:5174/newsroom/` and tap a development account on the sign-in page. Base path is `/newsroom/`; `/api` and `/media` proxy to :8000. React StrictMode double-mounts effects in dev.
- Reader: `cd apps/reader && npx vite --port 3000`; Today is ranked by `?near=` (default JH:ranchi).
- Without RESEND_API_KEY, forgot-password answers include `dev_link` (development only) and invites return `invite_link`.
- Switch users by clearing `localStorage['newsroom.staff.token']` and reloading.
- Stop servers when done (uvicorn :8000, vite :5174, :3000).
