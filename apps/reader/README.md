# News APP Reader

The public website: Ranchi, Jharkhand, India and world news in English and Hindi. A React single-page app that is **prerendered to static HTML** so search engines and AI agents can read every story, and hydrated in the browser for the interactive parts (save, follow, highlight, search, accounts).

## Run it

```bash
pnpm install
pnpm dev                       # from the repo root: API on :8000, Reader on :3000, Newsroom on :5174
# or just the Reader (API must be running):
pnpm --filter @news/reader dev
```

Open http://localhost:3000. Stories come from `apps/api/content/` through the API.

## Build and check

```bash
cp apps/reader/.env.example apps/reader/.env      # set VITE_SITE_URL to your domain
pnpm --filter @news/reader build                  # dist/: one index.html per page, sitemaps, feeds, robots.txt, llms.txt, *.md
pnpm --filter @news/reader serve                  # http://localhost:4173, behaves like the production static host
pnpm --filter @news/reader test                   # unit + render tests for every layout
pnpm --filter @news/reader audit:responsive       # 13 widths x every route; fails on horizontal overflow
```

The build reads stories from the live API when `SNAPSHOT_URL` is set (production) and from `apps/api/content` otherwise (needs Python 3.11+). See [`../../DEPLOYMENT.md`](../../DEPLOYMENT.md) and [`../../SEO.md`](../../SEO.md).

## How it fits together

- **Design**: pixel-ported screens in `src/screens/<Name>/{Desktop,Mobile}.tsx`, switched at 768 px. The design's CSS classes are in `src/styles/app.css` and are not renamed. Phones and desktops each get their own layout; both are in the prerendered HTML and CSS shows the right one, so there is no flash.
- **Data**: `src/lib/data.tsx` (SWR hooks over `/api`), content from the API, nothing hard-coded. Loading, error, offline and empty states reuse the design's state screens.
- **Reader's shelf**: saved stories, likes, followed desks and writers, highlights and language live in `localStorage` and sync to the account when signed in (`lib/library.ts`, `lib/session.tsx`).
- **Privacy**: cookie banner and preference centre, Global Privacy Control respected, analytics events only after consent (`lib/consent.ts`).
- **Desks**: 13, from `packages/contracts`. Each story also has a coverage area (Ranchi, Jharkhand, India, World) behind the Local / State / National / World switch.

See [`CLAUDE.md`](CLAUDE.md) for the folder map, route table and working rules.
