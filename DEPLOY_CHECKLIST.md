# Deployment status and verification checklist

Legend: **Built** = implemented and covered by local tests/build (API 50 tests, Reader+Newsroom 70 tests, typecheck clean). **Live?** column is for you to tick after checking the deployed site. Nothing below has been verified on a live host yet, because no host has been deployed.

## Deployment state (honest status)

| Item | State |
|---|---|
| Code on GitHub | Branch `feat/reader-redesign-seo` pushed to `Prem16180/news-app` (private). `main` still at `408fb36`. |
| Database | Neon project `news-platform` (`snowy-darkness-58260210`, Singapore, PG17) created, empty. Tables are created by the API on first start. |
| API (Render) | **Not created.** The create call was blocked by the permission classifier as a production deploy. |
| Reader (static) | Not created |
| Newsroom (static) | Not created |
| Gemini key | Received. In gitignored `apps/api/.env` and `secrets/api.env` only; verified live (model `gemini-3.5-flash`). Not yet set on any host. |
| Neon Auth | Enabled on the Neon project (Better Auth). Reader origin still has to be added as a trusted domain once its URL exists. |
| Local secrets | `.env.deploy.local` (gitignored) holds generated JWT secret, API key and first-admin login. |

## Blockers to resolve

1. Render must be able to read the private repo `Prem16180/news-app` (Render is linked to `Prem1618-5`). Install the Render GitHub app on `Prem16180`, or approve a different path.
2. Allow `create_web_service` / `create_static_site` on Render (or create them from the dashboard using `infra/render.yaml`).
3. Enter `GEMINI_API_KEY` in the host's env settings (it is in `apps/api/.env` locally). Rotate it after launch: it was shared in chat.
4. Uploaded media (`/media/...`) will not display on the split static hosts until a route or `VITE_API_URL` prefix is added (known, unfixed).

## One-click deploy when you are back (Render Blueprint)

`infra/render.yaml` now defines all three services (API, Reader, Newsroom), with Gemini wired in.
1. Install the Render GitHub app on `Prem16180` (github.com/apps/render, grant `news-app`).
2. Render dashboard -> New -> Blueprint -> pick `Prem16180/news-app`, branch `feat/reader-redesign-seo`, path `infra/render.yaml`.
3. Fill the prompted secrets: `DATABASE_URL` (Neon `news-platform`, copy from console.neon.tech), `GEMINI_API_KEY`, `NEWSROOM_ADMIN_EMAIL`, `NEWSROOM_ADMIN_PASSWORD` (see `.env.deploy.local`).
4. After the first deploy, set `NEWS_CORS_ORIGINS`, `READER_URL`, `NEWSROOM_URL`, the Reader's `VITE_SITE_URL`/`VITE_API_URL`/`SNAPSHOT_URL` and the Newsroom's `VITE_API_BASE` to the real `*.onrender.com` URLs, then redeploy.

## Gemini and Neon Auth wiring (done in code)

- **Gemini:** set `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`, default `gemini-3.5-flash`) on the API. `gemini-2.5-flash` is closed to new keys. Thinking is switched off for Gemini calls so long translations are not cut short, and one retry covers Google's "high demand" 503s. `/api/ai/status` should then report `enabled: true` with tasks `headline, summary, proofread, translate, tags, seo`.
- **Neon Auth (reader only, alongside the local login):** API `NEON_AUTH_URL`, Reader build `VITE_NEON_AUTH_URL` (same value). In Neon console -> Auth, add the Reader's `https://...onrender.com` origin as a trusted domain, otherwise sign-in is refused. The API verifies the EdDSA token against Neon's JWKS (issuer = auth URL origin).

## Feature checklist

### Reader (public site)
| Done | Live? | Feature | Detail to check |
|---|---|---|---|
| Built | [ ] | 13 desks | Each desk page lists its stories |
| Built | [ ] | Article packs | Real articles load with photos from `/images/` |
| Built | [ ] | English / Hindi | Language toggle, Hindi tab labels, Hindi-only stories have readable URLs |
| Built | [ ] | Prerendered SEO | View-source on a story shows text and JSON-LD |
| Built | [ ] | `/sitemap.xml`, news sitemap, RSS, `/robots.txt`, `/llms.txt` | All open and non-empty |
| Built | [ ] | Location picker | State -> district (Jharkhand's 24, default Ranchi); saved and synced to account |
| Built | [ ] | Ranked Today feed | District, then state, then national/world; other states' local news hidden (`?near=JH:ranchi`) |
| Built | [ ] | Breaking banner | Red banner, region-matched, expires after 6 hours; breaking becomes top story |
| Built | [ ] | Rich article formatting | Tables, fact boxes, video, audio, colours, pull quotes, alignment, subheadings, photo credits |
| Built | [ ] | Reader accounts | Sign-up, sign-in, saved items (local login) |
| Built | [ ] | Neon sign-in (reader) | "Continue with Neon sign-in" on Log in / Sign up opens `/auth/sign-in`; after sign-in the saved shelf syncs; `/neon-account/settings` for account; Log out signs out of Neon too |
| Built | [ ] | Neon pages are private | `/auth/*` and `/neon-account/*` are noindex and in robots Disallow |
| Built | [ ] | Reset-password page | `/reset-password` for local and Supabase links |
| Built | [ ] | Install prompt + offline | Install sheet from 2nd visit; recently read stories work offline |
| Built | [ ] | Personalisation consent | Consent banner, "load more" on sections, landing button, theme colour |
| Built | [ ] | Contact page | Needs `VITE_CONTACT_EMAIL`, otherwise shows "details are being set up" |
| Built | [ ] | Responsive audit | `pnpm --filter @news/reader audit:responsive <url>` |

### Newsroom (staff app)
| Done | Live? | Feature | Detail to check |
|---|---|---|---|
| Built | [ ] | Staff sign-in | First admin from `NEWSROOM_ADMIN_EMAIL` / `NEWSROOM_ADMIN_PASSWORD`; no demo accounts in production |
| Built | [ ] | Invite links | Admin invites editors, editors invite reporters; emailed via Resend if set, always copyable, WhatsApp share |
| Built | [ ] | Ask to join + approve | Admin approves requests |
| Built | [ ] | Trusted reporter / suspend / move reporters | Trusted reporters publish directly, editor checks after |
| Built | [ ] | Forgot / reset password | One-hour links; changing password signs out other devices |
| Built | [ ] | Classic editor | Paste from Word/Docs/web cleaner, find and replace, digit converter, tables, fact box, text styles and sizes |
| Built | [ ] | Writing screen | Autosave, offline backup, camera/gallery/voice capture, Hindi version tab |
| Built | [ ] | Publish sheet | "Who is it for?" (local/state/india/world + state + district), Normal/Breaking, Enter to send |
| Built | [ ] | Review workflow | Draft, send, send back, decline, publish, take down, reopen |
| Built | [ ] | Highlights | Problem / suggestion / comment anchored in text; writer applies suggestion or marks fixed |
| Built | [ ] | "Changed by senior" notice | Stays until writer opens "View changes" |
| Built | [ ] | History graph | Every version saved; same-person edits within 10 min merge |
| Built | [ ] | Home, Review queue, Stories, Team, Person, Numbers, Settings | Real data only, CSV export |
| Built | [ ] | Media upload | Photo, video, voice; content-checked; served at `/media/` (needs persistent disk) |
| Built | [ ] | PWA | Manifest, service worker (never caches API), install card, iPhone hint |
| Built | [ ] | Publish -> Reader rebuild | Deploy hook (`NEWS_DEPLOY_HOOK_URL`), debounced to one per 45 s, ~1 min to appear |

### AI / translation (needs the Gemini key)
| Done | Live? | Feature | Detail to check |
|---|---|---|---|
| Built, key set locally | [ ] | AI status | `/api/ai/status` shows `enabled: true` and 6 tasks |
| Verified live locally | [ ] | Translate EN <-> HI | One-click button in the editor; keeps names and numbers; Hindi output checked |
| Verified live locally | [ ] | Headline ideas, subheading, tags | Headline suggestions, subheading writer, "Suggest topics" in Details |
| Verified live locally | [ ] | Search description (SEO) | "Search description" in Details: a <=155 character sentence with Copy (not stored on the story) |
| Built | [ ] | AI result cache | Same text + task answered from memory (saves free-tier quota) |
| Built | [ ] | AI cost cap | Security fix: limit on AI calls per user |

### Security and platform (the minute ones)
| Done | Live? | Item |
|---|---|---|
| Built | [ ] | API refuses to start in production without `JWT_SECRET` and `NEWSROOM_API_KEY` |
| Built | [ ] | CORS limited to the two front-end origins (`NEWS_CORS_ORIGINS`) |
| Built | [ ] | Cookie SameSite (`none` on separate onrender.com hosts; `lax` if on sibling subdomains) |
| Built | [ ] | Link sanitising (XSS fix), reader data takeover fix, fake trending fix, token mix-up fix |
| Built | [ ] | Rate limiting (in-memory; resets on restart; move to Redis if scaled) |
| Built | [ ] | Security headers: nosniff, referrer policy, HSTS, permissions policy (camera/mic only on Newsroom) |
| Built | [ ] | Newsroom pages are `noindex` |
| Built | [ ] | Cache headers: assets immutable, `sw.js` no-cache, API lists `max-age=30, stale-while-revalidate` |
| Built | [ ] | Build fails on purpose if `VITE_SITE_URL` is a placeholder in CI |
| Built | [ ] | `/api/health` health check |
| Known gap | [ ] | Uploaded `/media/` images do not display on separate static hosts |
| Known gap | [ ] | Free Render API sleeps after idle (~30 s wake); uploads wiped on redeploy without a disk (paid plan) |
| Known gap | [ ] | Resend email not configured: invite/reset links only appear in the API log and the Newsroom |
| Known gap | [ ] | Railway volume permissions note is Railway-specific; not applicable on Render |

## After deploy: first steps
1. Open the Newsroom URL, sign in with the admin email, change the password, then delete `NEWSROOM_ADMIN_PASSWORD` from the host env.
2. Set `NEWS_CORS_ORIGINS` to the two real front-end URLs, `READER_URL`, `NEWSROOM_URL`, then redeploy the API.
3. Create a deploy hook for the Reader and set `NEWS_DEPLOY_HOOK_URL`.
4. Publish a test story, confirm it appears in the Reader after the rebuild, and check `/sitemap.xml`.
