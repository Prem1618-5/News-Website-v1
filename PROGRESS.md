# Newsroom overhaul: progress

Legend: ✅ done · 🔄 in progress · ⏳ not started. Updated as the work moves on. The work above is committed in `154bbc2`; only this file is untracked.

## 1. Planning ✅
| Subtask | What it is for | What was done |
|---|---|---|
| Explore newsroom, API, reader | Find what works, what is fake, what is broken | Found: newsroom ran on in-memory demo data, nothing reached the reader, photos were temporary `blob:` links, Hindi dropped on publish, no invites/approval/reset, no PWA |
| Plan | Agree the approach | Plan written, including the dead-feature decisions and the bilingual answer |

## 2. Shared data: places and priority ✅
| Subtask | Use | Done |
|---|---|---|
| Locations in `packages/contracts` | One list of states and districts for API, newsroom and reader | All 36 states/UTs, Jharkhand's 24 districts (EN + HI), default Ranchi |
| New coverage levels | Local < State < National/World ranking | `local / state / india / world` + state + district; old `ranchi/jharkhand` rows migrate automatically |
| Priority | Normal vs breaking | `normal / breaking`, breaking lasts 6 hours |

## 3. API (FastAPI) ✅ (50 tests passing)
| Subtask | Use | Done |
|---|---|---|
| Stories saved on the server | Drafts survive reloads, work across devices | New tables: stories, review notes, history (revisions), media, notifications, one-time links |
| Review workflow | Reporter → editor → published | Draft, send, send back, decline, publish, take down, reopen; trusted reporters publish directly and an editor checks after |
| Highlights | Editor marks problem / suggests wording / comments | Notes anchored in the text, writer can apply a suggestion or mark fixed |
| "Changed by senior" | Writer sees editor's direct edits | Server tracks editor edits since the writer last opened the story |
| Change history (git-style graph) | Who changed what, when | Every version saved; same-person edits within 10 min merged |
| Accounts | Admin adds editors/reporters, editor adds reporters | Invite links (emailed via Resend when set up, always copyable), approve "ask to join", trusted switch, suspend, move reporters |
| Forgot password | Reset by email | Staff and reader resets with one-hour links; changing password signs out other devices |
| Media upload | Photo, video, voice from phone | Files checked by content, stored and served at `/media/` |
| Location feed | Local news first for each reader | `?near=JH:ranchi` ranking; other states' local news left out of the front page |
| Bilingual publish | English and Hindi stored, never translated per view | Both versions published; Hindi-only stories get readable web addresses |
| Security fixes | Close holes found in the audit | Link sanitising (XSS), reader data takeover, fake trending, AI cost cap, token mix-up |

## 4. Newsroom app ✅
| Subtask | Use | Status |
|---|---|---|
| Classic editor (replaces Notion-style) | Paste from Word / Docs / web, write on a phone | ✅ Basic + More toolbars, text styles with sizes, Hindi labels, paste cleaner, find & replace, digit converter, tables, fact box |
| Writing screen | Photo, headline, subheading, text, one button | ✅ Autosave, offline backup, camera/gallery/voice, Hindi version tab, optional AI draft |
| Publish sheet | "Who is it for?" + Normal/Breaking, Enter to send | ✅ |
| Review tools | Highlights, notes list, send back, decline | ✅ Soft colours (rose/amber/blue) |
| History graph + "what changed" | See every edit | ✅ "Changed by" notice now stays until the writer opens "View changes" |
| Home, Review queue, Stories, Team, Person, Numbers, Settings | Simple management | ✅ Real data only; CSV export; WhatsApp invite sharing |
| Sign in / Ask to join / Forgot / Invite link pages | Accounts | ✅ |
| Typecheck + build | Catch errors | ✅ clean; production build OK |
| Install as app (PWA) | Home-screen app on phone and desktop | ✅ Manifest, service worker (offline shell, never caches API), dark "N" icons, install prompt (sidebar card, phone sheet, iPhone hint) |
| Unit tests | Keep logic correct | ✅ 7 tests: word diff (Hindi too), places, story text/reading time |

## 5. Reader site ✅ (70 tests passing)
| Subtask | Use | Status |
|---|---|---|
| Location picker + ranked Today feed | District → state → national/world order | ✅ Real state/district picker, place saved (and synced to account), feed uses `?near=`; prerender mirrors the API ranking (tested) |
| Breaking banner | Region-matched, 6 hours | ✅ Red banner on Today; breaking story becomes top story |
| Show new formatting | Tables, fact boxes, video, audio, colours, pull quotes | ✅ Plus alignment, subheadings, photo credits; media limited to site files |
| Reset-password page | Readers' forgot-password link | ✅ `/reset-password` (local accounts and Supabase links) |
| Install prompt + offline | Phone users | ✅ Install sheet from 2nd visit, service worker keeps recently read stories offline |
| Small fixes | Hindi tab labels, section "load more", personalisation consent, landing button, theme colour | ✅ Also article place label, newsroom mic/camera header override |

## 6. Finish 🔄
| Subtask | Status |
|---|---|
| Run all tests and builds | ✅ API 50, Newsroom 7, Reader 70; typecheck clean; newsroom build OK |
| Try it in the browser at phone width | ✅ Reporter writes + sends breaking from phone; editor highlights, suggests, edits, sends back; reporter applies suggestion; approved story tops Ranchi feed with banner, absent for Bihar. Fixed during the check: dev double-mount deleted new drafts, effect cleanup crash, dialog focus, false "Editing…" badge |
| Update deployment notes (new env vars, media volume) | ✅ `apps/api/.env.example` and `DEPLOYMENT.md` (env table, media volume, first-admin sign-in, go-live checklist) |
| Commit | ✅ Feature work in `154bbc2`. The `DEPLOYMENT.md` and `PROGRESS.md` edits are uncommitted, waiting for your go-ahead |

## Open before launch
| Item | Detail |
|---|---|
| Uploaded media on split hosts | Uploads are saved as `/media/...`; on Cloudflare Pages (Reader, Newsroom) that path does not reach the API, so uploaded images and clips will not show. Needs a `/media/*` route to the API or a `VITE_API_URL` prefix in Reader and Newsroom (see `DEPLOYMENT.md`). Found while updating the deployment notes; not fixed. |
| Railway volume permissions | Untested: non-root container may need `RAILWAY_RUN_UID=0` to write to the volume |
| Not deployed | Nothing here has been run on Railway, Neon, Pages or Resend |
