# Deployment status and verification checklist

Deployed 20 Oct 2026 on Render (Singapore) with Neon Postgres. Everything below marked **[x]** I checked against the live URLs myself (curl, view-source style fetches, and a browser load). Items marked **[ ]** need your eyes, usually because they need a signed-in newsroom session, which I deliberately did not drive.

## Live addresses

| Part | URL |
|---|---|
| Reader (public site) | https://news-reader-42rh.onrender.com |
| Newsroom (staff app) | https://news-newsroom.onrender.com |
| Platform API | https://news-platform-api-36j4.onrender.com (`/api/health`) |
| Database / Neon Auth | Neon project `news-platform` (`snowy-darkness-58260210`) |
| Code | https://github.com/Prem1618-5/News-Website-v1 (`main`, auto-deploys all three) |

First admin: email `gpremsinghg50@gmail.com`; the generated password is in `.env.deploy.local` (gitignored). Sign in at the Newsroom URL, change it, then delete `NEWSROOM_ADMIN_PASSWORD` from the API's Render environment.

## Do these first (things only you can do)

1. **Rotate secrets that were pasted in chat:** the Neon password and Gemini key (then update `DATABASE_URL` / `GEMINI_API_KEY` in Render), and revoke the old GitHub token.
2. **Deploy hook:** publishing a story does not update the Reader yet. In Render, Reader service -> Settings -> Deploy Hook, copy the URL and set it as `NEWS_DEPLOY_HOOK_URL` on the API. Until then, a new story shows in the app only after the Reader is redeployed.
3. **Email (optional):** set `RESEND_API_KEY` and `EMAIL_FROM`. Without it, invite and reset links appear only in the Newsroom and the API log.
4. **Contact page (optional):** set `VITE_CONTACT_EMAIL` on the Reader and redeploy.

## Things that are not as good as they should be (known gaps)

| Gap | What it means |
|---|---|
| Uploaded photos/video | Stored on the API's disk at `/media/...`. The Reader and Newsroom are on other hosts, so uploaded images will not display; and the free API has no persistent disk, so uploads vanish on every redeploy. Needs a route or full-URL prefix plus a disk or R2. Article-pack images (`/images/`) are fine. |
| Free Render API | Sleeps after ~15 min idle; first call afterwards takes ~30-60 s. Reading the Reader is unaffected (static). |
| Security headers on static hosts | Render ignores the Reader's `_headers` file. Reader and Newsroom send only HSTS and `nosniff`: no `Referrer-Policy`, no `Permissions-Policy`, and assets are revalidated instead of cached for a year. Add them under each static site's Headers tab in the dashboard. The API sends its own set correctly. |
| SPA deep links | Render static hosting has no rewrite via the connector, so Newsroom deep links (and Reader `/auth/*`) load through `404.html` and answer HTTP 404 while still rendering the app. Public Reader pages are real files and are unaffected. Add a rewrite `/* -> /index.html` in the Newsroom's Redirects/Rewrites tab to make them 200. |
| Gemini free tier | Bursts of AI requests return a friendly "rate limiting, try again in a minute" message. One transient provider rejection happened on the first live call and did not repeat; the API now logs the reason if it happens again (`news.ai` in Render logs). |
| Rate limiting | In-memory, resets on restart; move to Redis if you scale out. |

## Reader (public site)

| Live? | Feature | Detail |
|---|---|---|
| [x] | Home, About, Categories, Login pages | All return 200 |
| [x] | 13 desks | 13 sections in the snapshot; 12 listed in the sitemap, 1 empty desk is set to noindex |
| [x] | Article packs | 27 real stories load |
| [x] | Prerendered SEO | Story page source has the article text, title, canonical on the live domain and 2 JSON-LD blocks |
| [x] | `/sitemap.xml`, `/news-sitemap.xml`, `/rss.xml`, `/feed.json`, `/robots.txt`, `/llms.txt` | All 200 and non-empty. (`/feed.xml` does not exist; the RSS is `/rss.xml`.) |
| [x] | Private pages kept out of search | `robots.txt` disallows `/account`, `/login`, `/auth/`, `/neon-account/` and others |
| [x] | Consent banner | Shown on first visit (Essential only / Choose / Accept all) |
| [x] | Neon sign-in page | `/auth/sign-in` renders the Neon card with no console errors; reader address is on Neon's trusted-domain list |
| [ ] | Neon sign-up and sign-in end to end | Create a test reader via "Continue with Neon sign-in", confirm you land signed in and the saved shelf syncs; Log out |
| [ ] | Local reader sign-up / sign-in / forgot password | `/signup`, `/login`, `/forgot-password` (reset email needs Resend) |
| [ ] | English / Hindi | Language toggle; Hindi stories have `/hi/story/...` addresses |
| [ ] | Location picker + ranked Today feed | State -> district, default Ranchi; local news first, other states' local hidden |
| [ ] | Breaking banner | Region-matched, red, 6 hours |
| [ ] | Rich article formatting | Tables, fact boxes, video/audio, pull quotes, photo credits |
| [ ] | Install prompt + offline | Install sheet from 2nd visit; recent stories offline |
| [ ] | Saved items, follows, onboarding | Saved shelf persists across devices after sign-in |
| [ ] | Responsive | Check at phone and desktop widths |

## Newsroom (staff app)

| Live? | Feature | Detail |
|---|---|---|
| [x] | App loads, login page | `/` and `/login` render; page is `noindex` |
| [x] | Admin sign-in | Admin login works against the live API and returns role `admin` |
| [x] | No demo accounts in production | Demo staff emails return 401 |
| [x] | Signed-out access blocked | Desk and AI endpoints return 401 without a token |
| [ ] | Invite links | Admin invites an editor; link is shown to copy (email only if Resend is set) |
| [ ] | Ask to join + approve; trusted / suspend / move reporters | |
| [ ] | Forgot / reset password | One-hour links; password change signs out other devices |
| [ ] | Classic editor | Paste from Word/Docs, find and replace, digit converter, tables, fact box, text styles |
| [ ] | Writing screen | Autosave, offline backup, camera/gallery/voice, Hindi version tab |
| [ ] | Publish sheet | Who is it for (local/state/india/world + place), Normal/Breaking |
| [ ] | Review workflow | Draft, send, send back, decline, publish, take down, reopen |
| [ ] | Highlights and notes | Problem / suggestion / comment; apply suggestion |
| [ ] | "Changed by senior" notice | Stays until the writer opens "View changes" |
| [ ] | History graph | Every version saved; same-person edits within 10 min merge |
| [ ] | Home, Review queue, Stories, Team, Person, Numbers, Settings | CSV export |
| [ ] | Media upload | Works but see the known gap above |
| [ ] | PWA | Manifest, service worker, install card |
| [ ] | Publish -> Reader update | Needs `NEWS_DEPLOY_HOOK_URL` (see "Do these first") |

## AI and translation (Gemini free tier, model `gemini-3.5-flash`)

| Live? | Feature | Detail |
|---|---|---|
| [x] | AI switched on | `/api/ai/status` reports `enabled: true` with tasks headline, summary, proofread, translate, tags, seo (provider name is hidden from the public) |
| [x] | Translate English -> Hindi | Live call through the deployed API returned correct Devanagari |
| [x] | Translate Hindi -> English | Live call returned an accurate English translation (names and numbers kept) |
| [x] | Search description (SEO) | Live call returned a one-sentence description (in the story's language) |
| [x] | Free-tier rate limit handled | Burst of calls returned the friendly 429 message, not an error page |
| [ ] | Headline ideas, subheading writer, "Suggest topics" | Verified working locally against Gemini; try them in the editor (they were rate-limited when I tried them live) |
| [ ] | One-click translate button in the editor | Writing screen -> Hindi/English tab -> translate; check the draft is flagged "not checked yet" |
| [ ] | "Search description" button | Details panel; Copy button; not stored on the story |
| n/a | Result cache | Same text + task is answered from memory to save quota (unit tested) |

## Security and platform (the minute ones)

| Live? | Item |
|---|---|
| [x] | API refuses to start in production without `JWT_SECRET` and `NEWSROOM_API_KEY` (and it started, so both are set) |
| [x] | CORS: preflight from the Reader origin is allowed with credentials; an unknown origin (`evil.example`) is refused (400) |
| [ ] | Cookies: `SameSite=none; Secure` is configured because the three apps are on separate `onrender.com` hosts; confirm a reader stays signed in after a page reload (I did not create a reader account on the live site) |
| [x] | `/api/health` returns ok; HSTS, `nosniff` and `Referrer-Policy` on the API |
| [x] | Neon token verification: API accepts only EdDSA tokens from your Neon issuer (12 automated tests; staff tokens and Neon tokens are not interchangeable) |
| [x] | Production-clean build: fresh-clone install and build pass in CI mode (pnpm 12 `core-js` build script declined; `python-multipart` added; both were deploy blockers I found and fixed) |
| [x] | Newsroom is `noindex`; Neon pages are `Disallow`ed |
| [ ] | Link sanitising (XSS), reader data takeover, fake trending, token mix-up fixes | Covered by the 81 API tests; nothing live to eyeball |
| [ ] | Security headers on static hosts | Known gap above |
| [ ] | `sw.js` and asset caching on static hosts | Known gap above |

## After you sign in

1. Newsroom -> sign in as admin -> change the password -> delete `NEWSROOM_ADMIN_PASSWORD` in Render.
2. Set `NEWS_DEPLOY_HOOK_URL` (see "Do these first").
3. Publish a test story, confirm it appears after the Reader rebuild, check `/sitemap.xml`.
4. Optional: custom domain on the Reader and Newsroom; if the API moves to a sibling subdomain (`api.example.com`) set `NEWS_COOKIE_SAMESITE=lax`.
