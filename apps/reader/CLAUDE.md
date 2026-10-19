# Reader (`@news/reader`)

Public news site. React 19 + TypeScript + Vite + Tailwind v4 (theme/utilities only) + react-router + swr, prerendered to static HTML at build time. Talks to the FastAPI Platform API under `/api`.

## Commands
```bash
pnpm --filter @news/reader dev            # http://localhost:3000, proxies /api to :8000 (start the API first: pnpm dev:api)
pnpm --filter @news/reader typecheck && pnpm --filter @news/reader test   # run both before finishing any change
pnpm --filter @news/reader build          # tsc, vite build, then scripts/prerender.mjs -> dist/
pnpm --filter @news/reader serve          # serve dist/ like a static host, real 404s (add --api http://127.0.0.1:8000)
pnpm --filter @news/reader audit:responsive [baseUrl]   # 13 widths x every route, fails on horizontal overflow
```

## Folder map
```
src/screens/<Name>/{index,Desktop,Mobile}.tsx   one folder per route; index wires data + <Seo>, layouts draw it
src/components/shared/   SiteHeader, MobileHeader, TabBar, DeskRail, SiteFooter, NoticeMenu, States (loading/error/empty), DocPage
src/components/story/    cards.tsx (TileCard, RowCard, HeroDesktop...), writers.tsx
src/components/ui/       icons, controls (Follow/Like/Save toggles, ScopeSwitch/Chips, DeskPills)
src/lib/                 api, data (swr hooks + keys), prefetch (build-time swr fallback), head (<Seo>), seo (JSON-LD), library (saved/follow/lang),
                         session (auth), consent (+analytics), responsive (Layouts), blocks (story body renderer), taxonomy, format
src/build/artifacts.ts   sitemaps, RSS, robots.txt, llms.txt, per-story Markdown, _headers (build time only)
src/styles/              app.css (design classes, do not rename), responsive.css (breakpoints), index.css
scripts/prerender.mjs    static render of every page; scripts/serve.mjs; tools/resp.mjs (responsive audit); tools/make-icons.mjs
```

## Routes
| Path | Screen | Indexed |
|---|---|---|
| `/` | Today | yes |
| `/story/:slug`, `/hi/story/:slug` | Article (English / Hindi) | yes |
| `/section/:desk` (13 desks) | Section | yes (noindex while empty) |
| `/writer`, `/writer/:slug` | Writer / desk page | yes |
| `/categories` | Categories (phones only; desktop redirects to `/`) | yes |
| `/about` `/editorial-standards` `/contact` `/privacy` | `screens/Info/*` | yes |
| `/search` `/following` `/saved` `/notifications` `/account` `/location` | app screens | no |
| `/login` `/signup` `/forgot-password` `/onboarding` `/onboarding/2` `/landing` | account flow | no |
| `/following/empty` `/saved/empty` `/search/no-results` `/notifications/empty` `/states/*` `/design-system` | design previews | no |
| `/404`, anything else | NotFound | no |

Routes live in `src/routes.tsx`. Add a screen there and in `scripts/prerender.mjs` (`SCREEN` map) if it should be preloaded.

## Rules
- **Do not change the design.** Keep the class names in `app.css` and the inline-style recipes in the components. Visuals at 1440 and 390 must stay as designed.
- Edit shared components (`cards.tsx`, `SiteHeader`...), never copy a block into a screen.
- Every screen renders **both** layouts in prerendered HTML (`lib/responsive` → `Layouts`); CSS picks one, then JS keeps only the matching one. Do not branch on `window.innerWidth` during render. Anything that depends on the browser or the clock (time-ago, saved items, unread counts) must render empty first and fill in after mount (`useMounted`), or the hydration will warn.
- Data goes through `lib/data.tsx` keys. A page that should be prerendered with data needs its keys in `lib/prefetch.ts` (`keysFor`).
- Content comes from the API. No sample stories, authors, counts or images in code. Third-party photos are never hotlinked.
- New public pages need `<Seo>` (title, description, path) and an entry in `build/artifacts.ts` `staticPages` if they belong in the sitemap.
- Desk list and names come from `@news/contracts`; the API copy is `apps/api/app/taxonomy.py` (a test keeps them equal).
- Keep `MOBILE_MAX` in `lib/useIsMobile.ts` in sync with the `767.98px` queries in `responsive.css`.
- Run `pnpm typecheck && pnpm test` (repo root) before finishing.
