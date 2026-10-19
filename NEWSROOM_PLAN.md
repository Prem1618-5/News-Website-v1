# Newsroom overhaul: phone-first writing, real review workflow, location ranking, accounts

## Context
The Newsroom looks finished but is a front end over in-memory demo data: nothing persists, nothing reaches the
Reader (no call to `POST /api/newsroom/articles`), media are `blob:` URLs, Hindi is dropped on publish, staff
cannot be invited/approved/reset, and there is no PWA. The goal (USP: anyone publishes from a phone; MOAT:
speed) needs a persisted server workflow, a simple classic editor, a one-screen publish flow, location-ranked
feeds and working accounts.

## Decisions
- **Editor:** replace BlockNote/Mantine with TipTap (ProseMirror). Classic toolbar: *Basic* (preset Heading
  22px / Subheading 18px / Paragraph, bold, italic, underline, lists, quote, link, photo, undo/redo) and a
  *More* toggle (strike, highlight, 6-colour text palette, align, sub/sup, divider, table, fact box,
  pull-quote, clear formatting, find & replace, digits ०-९⇄0-9, word count). Headline/subheading are fixed-style
  textareas. Paste cleaner for Word / Google Docs (`docs-internal-guid` bold wrapper, `mso-*` junk, span styles →
  marks); pasted third-party images are dropped (no hotlinking), pasted data-URL images are uploaded. Sticky
  bottom toolbar on phones. Draft body stored as TipTap JSON; on publish the server converts it to the Reader's
  existing block format (no HTML stored or rendered).
- **Workflow (server-side, `NewsroomArticle`)**: `draft → submitted → (changes_requested ↔ submitted) →
  published`, plus `rejected`, `unpublished`. Approve = publish. Trusted reporters, editors and admins publish
  directly. Optimistic `version` for conflicts. Every save/event writes an `ArticleRevision` (coalesced per
  actor per 10 min) → git-style two-lane graph (author lane / desk lane) with word diffs.
- **Review:** senior selects text → *Problem* (soft rose wavy underline), *Suggest* (soft amber, with
  replacement text, one-tap Accept), *Comment* (soft sky). Anchors are a `note` mark inside the TipTap JSON
  (survive edits), stripped on publish. Senior direct edits are revisions by a non-author; the author sees
  "Changed by Mary (Editor) · View changes" with a soft green/red diff view.
- **Priority:** `normal | breaking`. Breaking jumps to the top of every queue, trusted/editor publish instantly,
  shows a region-matched banner in the Reader for 6 h (`breaking_until`), then becomes a normal story.
- **Publish overlay** (one sheet): Who is it for? *My district* / *My state* / *All India* / *World*
  (defaults from the writer's home state/district), Breaking toggle, desk, then one button
  ("Publish" or "Send to editor").
- **Location:** contracts gain all 36 states/UTs and Jharkhand's 24 districts (EN/HI). Story gets
  `scope` level (`local|state|india|world`) + `state` + `district`; existing `ranchi/jharkhand` rows migrate.
  Feed ranking `?near=JH:ranchi`: effective age = age − boost (local 18 h, state 8 h, national/world 0,
  breaking +48 h); other states' local/state news is excluded from Today. Reader location picker saved in the
  library store.
- **Bilingual (answer to the system-design question):** store both versions, never translate at read time.
  The writer writes once in their language; the second language is optional, added once (by hand or a one-tap
  free-tier AI draft marked "needs proofreading"), and can be added after publishing. Reader shows the
  version that exists (current `title_hi`/`has_hi` logic). Cost: zero per view; proofreading only when a
  second version is wanted.
- **Accounts:** admin creates editor/reporter, editor creates reporter (assigned to them). Creator gets an
  invite link (emailed via Resend when `RESEND_API_KEY` is set, always copyable for WhatsApp). Self-signup
  becomes "request access" → admin approves. Staff + local reader forgot/reset via hashed one-time tokens
  (1 h; invites 72 h) + Resend. `token_version` revokes sessions on reset/suspend. First admin from
  `NEWSROOM_ADMIN_EMAIL`/`NEWSROOM_ADMIN_PASSWORD`; dev demo staff kept for local only.
- **Media:** `POST /api/newsroom/media` (photo/video/audio, client-side photo resize to 2000 px), stored in
  `MEDIA_DIR/uploads`, served at `/media/`. Camera capture + in-browser audio recording.
- **PWA:** Newsroom manifest + SW + install prompt (desktop and phone); Reader SW + install sheet on phones
  (iOS "Add to Home Screen" hint). Dismissal remembered 14 days.

## Dead / fake features → decision
| Feature | Decision |
|---|---|
| Demo workspace, role switcher, `?demo=1`, seed data | Remove (dev demo accounts stay, API-backed) |
| Claims/leases, SLA pools, timeout auto-publish, escalation | Remove; show "waiting 12 min" + breaking first |
| Supervision, mistakes scoring, strikes, notices, warnings | Lighter: one **Trusted** toggle (publishes directly) |
| Kill switches, break-glass, holds | Remove (admin publishes directly; unpublish covers takedown) |
| Post-publication checks | Lighter: "Published without review" list with **Looks good** |
| MFA/TOTP claims, "server checks it" copy, presence dots | Remove text; not built |
| Notifications bell | Lighter: real list (returned to you, waiting for review, published) |
| Filters span, disabled Export (Articles/Analytics) | Real status/desk/author filters; client CSV export |
| Fake analytics (seed views, hard-coded 1h12m / 12.4K) | Real: views per story from events, time-to-publish from revisions |
| AI: proofread/translate/tags unused | Keep headline + summary; add translate for second language |
| Search-preview `newsapp.example`, legal-check checkbox | Remove |
| Reader `/location` stub, Ranchi-only "Near you", unsaved scope switch | Real picker + ranking |

## Bugs fixed along the way
API: XSS via unsanitised inline links (allow-list in converter), legacy reader-state takeover, unthrottled
events/consent/AI, reader tokens without `aud`, Hindi dropped on publish, `/media/` not served, tests hard-coding
27 stories, missing env vars. Newsroom: stuck `approved`, withdrawn dead end, self-resolved must-fix, urgency
quota bypass, Hindi slug mangling, dead search on /articles, double-Escape, mobile can't publish. Reader:
personalisation consent ignored, section load-more capped at 40, Hindi labels in TabBar, landing CTA mismatch,
theme-color.

## Files
- API: `models.py`, `database.py` (new columns), `config.py`, `security.py`, `schemas.py`, `taxonomy.py`,
  `routers/staff_auth.py`, new `routers/desk.py` (articles, notes, revisions, team, media, stats),
  `routers/newsroom.py` (publish service reused), `routers/content.py` (ranking, `/media`), `routers/auth.py`
  (reset), new `services/email.py`, `services/publish.py`, `services/doc.py` (TipTap JSON → blocks), tests.
- Contracts: `packages/contracts/contracts.json` + `src/index.ts` (scopes, states, districts).
- Newsroom: new `api/*` (SWR client), `features/editor/*` (TipTap), `features/compose/*`, home/queue/
  articles/team/analytics/auth pages; delete `domain/workflow.ts`, `sla.ts`, `supervision.ts`, `data/seed.ts`,
  `state/store.tsx` workflow parts; add `public/` manifest, SW, icons.
- Reader: `lib/data.tsx`, `lib/library.ts` (location), `screens/Today/model.ts`, `screens/Location`,
  breaking banner, `lib/blocks.tsx` (new block types/marks), PWA files.

## Verification
`python -m pytest apps/api/tests` (workflow, permissions, invites, reset, ranking, converter, sanitising);
`pnpm typecheck && pnpm test`; run the API + Newsroom + Reader, and in the browser pane at phone width: invite
a reporter, accept invite, write with a photo, send breaking story, editor highlights/suggests/edits and
publishes, reporter sees "changed by", story appears first in the Reader for that district, forgot/reset
password, install prompt appears.
