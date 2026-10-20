# Deployment: what to run, where, and what it costs

**Recommendation for year one (≤ 1,000 visitors a day):** serve the Reader and Newsroom as static sites from a CDN (Cloudflare Pages), run the API as one small always-on container (Railway), and keep data in a free serverless Postgres (Neon). About **US$5–7 a month plus the domain**, no servers to patch, and it scales by changing plans rather than rewriting anything.

Nothing here has been deployed. This is the plan, with the repo already shaped to follow it.

## Why this shape suits the app

The Reader is **prerendered**: every story, desk and info page is a finished HTML file built ahead of time. A visitor, Googlebot or an AI agent gets the page from the CDN edge without touching the API or the database. The API only handles the dynamic parts: sign-in, saved items, publishing from the Newsroom, and the small JSON calls that refresh the lists after the page loads.

So the expensive part (serving readers) is the cheap part (static files), and the part that needs a server (a few API calls) is tiny.

```
Reader (static, prerendered)   ── Cloudflare Pages ──►  www.example.com
Newsroom (static app)          ── Cloudflare Pages ──►  newsroom.example.com
Platform API (FastAPI)         ── Railway container ──►  api.example.com   ──►  Neon Postgres
                                          ▲
Newsroom publishes ───────────────────────┘   API calls the Pages deploy hook ──► Reader rebuilds (~1 min)
```

Keep the API on a subdomain of the same registrable domain (`api.example.com`). Login cookies then count as first-party, which every browser accepts.

## Capacity check

1,000 visitors a day is roughly 5,000–10,000 page views, about one every ten seconds. Each page view makes one or two small API calls (the story list refresh), so the API sees well under one request per second on average.

- FastAPI with SQLite/Postgres idles around 100–150 MB of RAM and almost no CPU at this load. One container at 0.25 vCPU / 256 MB is plenty.
- Responses carry `Cache-Control: public, max-age=30, stale-while-revalidate`, so if `api.example.com` is proxied through Cloudflare most list calls never reach the container.
- Postgres holds a few hundred articles. The Neon free plan (0.5 GB, compute that sleeps when idle) is far above that.

## Options compared

| | Static hosting | API | Database | ≈ monthly | Notes |
|---|---|---|---|---|---|
| **A. Cloudflare Pages + Railway + Neon (recommended)** | Cloudflare Pages: free, 500 builds/month, static traffic is not billed | Railway Hobby: $5 plan, includes $5 of usage; RAM $10/GB, CPU $20/vCPU per month, so a small API is covered | Neon free | **$5** | Best speed and SEO (edge HTML). Always-on API. Cold start only on the database after idle (a few seconds, only on API calls). |
| B. All free tier | Cloudflare Pages | Render free web service | Neon free | $0 | The API sleeps after idle and takes ~30 s to wake. Reading still works (static); sign-in and publishing are slow after quiet periods. Fine for a soft launch. |
| C. One VPS | Caddy on the box | Docker on the box | Postgres on the box | $5–7 (Hetzner/DigitalOcean) | Cheapest at higher traffic and full control, but you patch, back up and monitor it. Pick this if you are comfortable with servers. |
| D. Vercel | Vercel | Python function | Neon | $20+ | The free Hobby plan is for personal, non-commercial use only; a news site needs Pro ($20 per user per month). Serverless Python also reloads the content on every cold start. Not the best fit. |
| E. Supabase for everything | Pages | Railway | Supabase free | $5 | Already wired for sign-in (`SUPABASE_URL`/`SUPABASE_ANON_KEY`) and gives password-reset email. Free projects pause after a week without activity. Reasonable if you want managed auth from day one. |

Prices and limits are from the providers' pages in October 2026 and change. Check the current figures at signup.

## Setup order

1. **Domain.** Buy it, put DNS on Cloudflare (free). Subdomains: `www` (Reader), `newsroom`, `api`.
2. **Database.** Create a Neon project, copy the connection string.
3. **API on Railway.** New project from this repo. The root `Dockerfile` and `railway.json` are ready. Variables:

   | Variable | Value |
   |---|---|
   | `APP_ENV` | `production` |
   | `JWT_SECRET` | 64 random characters (`openssl rand -hex 32`) |
   | `NEWSROOM_API_KEY` | another long random string |
   | `DATABASE_URL` | the Neon string |
   | `NEWS_CORS_ORIGINS` | `["https://www.example.com","https://newsroom.example.com"]` |
   | `NEWS_COOKIE_SAMESITE` | `lax` (API on a sibling subdomain) |
   | `NEWS_DEPLOY_HOOK_URL` | the Pages deploy hook from step 4 (add after step 4) |
   | `READER_URL` | `https://www.example.com`. Used for the reader's password-reset links. |
   | `NEWSROOM_URL` | `https://newsroom.example.com` (no trailing path, since the Newsroom is built with `NEWSROOM_BASE=/`). Used for staff invite and reset links. The default points at localhost, so emailed links are wrong until this is set. |
   | `RESEND_API_KEY` | from resend.com. Sends staff invites and password resets. Without it the links are only written to the API log (and the Newsroom still shows each invite link to copy). |
   | `EMAIL_FROM` | `Your Brand <newsroom@example.com>` on a domain verified in Resend. The default is a placeholder sender. |
   | `NEWSROOM_ADMIN_EMAIL`, `NEWSROOM_ADMIN_PASSWORD` | first admin, see "First sign-in" below. Optional `NEWSROOM_ADMIN_NAME` (default "Managing editor"). |
   | `NEWS_MEDIA_DIR` | `/srv/media`, the volume mount (see "Uploads" below) |
   | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | optional: managed accounts and password-reset email |
   | `GROQ_API_KEY` etc. | optional: AI assistant in the Newsroom |

   Point `api.example.com` at the Railway service. On first start the API creates the tables, adds any missing columns, syncs the 13 desks and loads the article packs in `apps/api/content/`.

   **Uploads (photos, video, voice).** The Newsroom saves files to disk on the API container, and the API serves them at `/media/`. A container's disk is wiped on every redeploy, so attach a Railway **volume** to the API service and mount it at `/srv/media`, then set `NEWS_MEDIA_DIR=/srv/media`. Without the volume, every uploaded photo disappears at the next deploy. The container runs as a non-root user; if uploads fail with "permission denied" on the volume, set `RAILWAY_RUN_UID=0` on the service (Railway's documented fix for volume permissions). Back the volume up, or move uploads to Cloudflare R2 later (see "Growing").

   **Uploaded files and the two front ends.** Uploads are stored as site-relative addresses (`/media/abc.jpg`). The Reader and Newsroom live on different hostnames from the API, so those addresses must also resolve on `www.example.com` and `newsroom.example.com`. This is not set up in the repo yet. Until it is, uploaded images and clips will not display. Two ways to close it: route `www.example.com/media/*` and `newsroom.example.com/media/*` to the API with a Cloudflare Worker route (untested here), or change the Reader and Newsroom to prefix `/media/` paths with `VITE_API_URL` (a small code change, including the prerender). The article packs' own images in `/images/` are unaffected.

   **First sign-in.** Set `NEWSROOM_ADMIN_EMAIL` and `NEWSROOM_ADMIN_PASSWORD` for the first deploy only. On start, if the newsroom has no admin, the API creates one from them (or promotes an existing account with that email). Sign in at `newsroom.example.com`, change the password, then **delete `NEWSROOM_ADMIN_PASSWORD` from the Railway variables**. From there the admin invites editors, editors invite reporters, and people can also use "Ask to join" for the admin to approve. In production no demo accounts exist, so without these two variables nobody can sign in to the Newsroom.
4. **Reader on Cloudflare Pages.** Connect the repo.
   - Build command: `corepack enable && pnpm install --frozen-lockfile && pnpm build:reader`
   - Output directory: `apps/reader/dist`
   - Variables: `VITE_SITE_URL=https://www.example.com`, `VITE_API_URL=https://api.example.com`, `SNAPSHOT_URL=https://api.example.com/api/snapshot`, `VITE_CONTACT_EMAIL=...`, `AI_TRAINING=allow` (or `block`), `NODE_VERSION=22` or newer.
   - Create a **deploy hook** (Settings, Builds) and give its URL to the API as `NEWS_DEPLOY_HOOK_URL`.
   - Custom domain `www.example.com`; redirect the bare domain to it.

   The build fails on purpose if `VITE_SITE_URL` is a placeholder in a CI environment, so you cannot ship a site whose canonical links point at the wrong domain.
5. **Newsroom on a second Pages project.** Build `corepack enable && pnpm install --frozen-lockfile && NEWSROOM_BASE=/ pnpm build:newsroom`, output `apps/newsroom/dist`, add `/* /index.html 200` as a redirect (single-page app), variable `VITE_API_BASE` as in `infra/render.yaml`. Put Cloudflare Access (free for small teams) in front of `newsroom.example.com` so only staff can even load it.
6. **Check it.** Run `pnpm --filter @news/reader audit:responsive https://www.example.com`, open `/sitemap.xml`, `/robots.txt`, `/llms.txt`, and a story page with "view source" (you should see the article text and JSON-LD in the HTML).

## How new stories reach readers

Newsroom publish, API stores it, API calls the deploy hook (debounced to one call per 45 s), Pages rebuilds from `/api/snapshot` in about a minute, the story is now plain HTML at its own URL, in the sitemap, news sitemap, RSS and `llms.txt`. In the minute before that, the app still shows the story to people who navigate to it (it fetches it from the API), but crawlers get a 404 until the rebuild finishes.

For true minute-by-minute breaking news later, move the story route to an edge function that renders on demand (see "Growing").

## Growing

| Trigger | Change |
|---|---|
| API CPU/RAM regularly above ~60 % | Raise the Railway service size, or add a second replica. Move rate limiting (`ratelimit.py` is in-memory) to Redis/Valkey first. |
| Database near 0.5 GB or sleeps hurt | Neon Launch plan, or Supabase Pro. |
| Hundreds of stories, build over ~3 minutes | Build only changed stories, or render story pages on demand in a Cloudflare Worker with the same React code and cache them at the edge. |
| Upload volume filling up, or you want a CDN for photos | Cloudflare R2 (free tier, no egress fees) for uploads instead of the Railway volume; store the full URL in the story's image and block `url`. Reader and API currently only accept `/media/` and `/images/` paths, so widen that allow-list in `blocks.tsx` and `services/doc.py` at the same time. |
| Heavy traffic or ads | Cloudflare in front of the API with cache rules, Argo/Tiered cache, a real analytics tool (Plausible/Umami) alongside the consented first-party events. |
| Uptime matters | Better Stack / UptimeRobot on `/api/health` and the home page (free tiers), Sentry (free tier) on the Reader. |

## Before you go live

- [ ] `VITE_SITE_URL` is the real domain; `VITE_CONTACT_EMAIL` is set (the Contact page says "details are being set up" without it).
- [ ] `APP_ENV=production`, strong `JWT_SECRET` and `NEWSROOM_API_KEY` (the API refuses to start without them).
- [ ] `NEWS_CORS_ORIGINS` lists only your two front ends.
- [ ] Demo staff accounts are not created (they are only seeded when `APP_ENV` is not `production`).
- [ ] A volume is mounted at `/srv/media` and `NEWS_MEDIA_DIR=/srv/media` is set. Upload a photo, redeploy, and confirm it is still there.
- [ ] `/media/...` addresses resolve on the Reader and Newsroom hostnames (see "Uploaded files and the two front ends").
- [ ] `READER_URL` and `NEWSROOM_URL` are the real addresses, `RESEND_API_KEY` is set and `EMAIL_FROM` uses a verified domain. Send yourself an invite and a password reset and open the links.
- [ ] You signed in as the first admin, changed the password, and removed `NEWSROOM_ADMIN_PASSWORD` from the environment.
- [ ] The editor notes in some pack stories ("please verify the year", "only the opening lines were retrievable") are resolved or removed. `python apps/api/app/content_pack.py` lists the flagged stories.
- [ ] Read the About, Editorial standards and Privacy pages and make sure they describe what you really do (AI assistance, corrections, who answers email).
- [ ] Submit the sitemap in Google Search Console and Bing Webmaster Tools, and apply to Google News Publisher Center (see `SEO.md`).
