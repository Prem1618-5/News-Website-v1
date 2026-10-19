# SEO and AI-search visibility (AIEO)

Nobody can promise a ranking. What this build does is remove every technical reason not to rank, give search engines and AI agents clean, structured, citable content, and leave the parts only you can do (original reporting, links, time) as a short list at the end.

## What is built in

### Pages that crawlers can actually read
- Every page is **prerendered to static HTML** (`pnpm build` runs `scripts/prerender.mjs`). Googlebot, Bing, and AI crawlers that do not run JavaScript (most do not) see the full story text, headline, byline, date, sources and links. The browser then hydrates it into the app.
- Real status codes: unknown URLs return a true **404** (`404.html`), not a blank page with a 200.
- One `<h1>` per page, landmarks (`<main>`, `<nav>`, `<footer>`), skip link, `lang="hi"` on Hindi text.

### Search engines
- Per-page `<title>`, meta description, **canonical** URL, robots, Open Graph and Twitter cards with a 1200×630 default share image.
- **hreflang** pairs between `/story/<slug>` (English) and `/hi/story/<slug>` (Hindi), plus `x-default`. Hindi stories have their own URL, title and description, which is what Hindi searchers need.
- **JSON-LD**: `NewsMediaOrganization` (with publishing principles and corrections policy URLs), `WebSite` with `SearchAction`, `NewsArticle` for every story (headline, dates, author, publisher, `articleSection`, `articleBody`, `citation` of the source reports, `contentLocation` for Ranchi/Jharkhand, `speakable`), `BreadcrumbList`, `ItemList` for desks and the home page, `ProfilePage` for authors, `AboutPage`/`ContactPage`.
- `sitemap.xml` (with hreflang alternates and last-modified dates), **`news-sitemap.xml`** (stories from the last two days, in the format Google News expects), `rss.xml`, `rss-hi.xml`, a feed per desk, `feed.json`.
- Private or app-only pages (`/account`, `/login`, `/saved`, `/search`, design previews) are `noindex` and listed as `Disallow`. A desk with no stories is `noindex` until it has one.
- Core Web Vitals: HTML is the first paint (fast LCP), fonts load without blocking, code is split per screen, no layout shift from late data (prerendered data is embedded), hashed assets cached for a year.

### AI answer engines and agents ("AIEO")
- **`robots.txt`** welcomes retrieval and answer-engine bots by name (OAI-SearchBot, ChatGPT-User, PerplexityBot, Perplexity-User, Claude-SearchBot, Claude-User, DuckAssistBot, Applebot, Bingbot, Googlebot) and declares a `Content-Signal` (`search=yes, ai-input=yes, ai-train=…`). Model-training crawlers (GPTBot, ClaudeBot, Google-Extended, CCBot…) follow the `AI_TRAINING` build variable: `allow` (default) or `block`. Choose deliberately: allowing training can increase how well models know your brand; blocking keeps your text out of training sets while staying fully visible to search and answer engines.
- **`/llms.txt`** (the llmstxt.org convention): a short, curated index with a link to the Markdown copy of every story, grouped by desk. **`/llms-full.txt`** has all stories in one file.
- **A Markdown copy of every story** at `/story/<slug>.md` (English and Hindi, sources included), advertised in the page head with `rel="alternate" type="text/markdown"`. Agents get the article without navigation or scripts.
- Answer-first structure: headline, a one-sentence standfirst marked `speakable`, then the facts; dates and sources are visible and machine-readable; every claim links to its source report, which is what citation-minded engines weigh.
- Trust pages (About, Editorial standards with a corrections policy, Contact, Privacy) linked from every page footer and from the structured data.

## What only you can do

These move rankings more than any markup, and they are not things code can fix.

1. **Verify and submit.** Add the domain to Google Search Console and Bing Webmaster Tools, submit `sitemap.xml` and `news-sitemap.xml`, and check the "Pages" report weekly. Apply to **Google News Publisher Center**.
2. **Original reporting.** Search engines now actively demote sites that mostly rewrite other outlets' reports ("scaled content" / scraped-content policies). The current article pack is rewritten from other publishers' pages, with sources named. That is honest and legal if you do not copy text, but it is not enough to rank on. Add what the sources do not have: a Ranchi reporter's photo, a quote from the person involved, a local explainer, a follow-up. The Newsroom is built for this. Even a few original stories a day, with a named reporter and a profile page, changes how the whole site is judged.
3. **Fix thin stories.** Several pack stories say "only the opening lines were retrievable". Expand or remove them. A site of 27 short items needs depth before breadth.
4. **Own the local niche.** "Ranchi news", "रांची समाचार", "Jharkhand news today", Durga Puja pandals, JSCA matches, Ranchi University notices: write for these and keep each desk updated daily. Hindi pages matter: most searchers in Jharkhand search in Hindi.
5. **Links and mentions.** Get linked from local institutions, colleges, forums and the outlets you cite; list the site in Google Business Profile if you have an office; keep the same name, logo and address everywhere (the `NewsMediaOrganization` data is built to match).
6. **Real photos.** Third-party photos are never hotlinked (rights). Add your own: story pages and Google Discover reward large original images (1200 px wide or more); the Newsroom hero image flows into `og:image` and the structured data automatically.
7. **Freshness.** Publish every day. Update stories when facts change (the `dateModified` follows). Stale news sites fall out of answer engines quickly.
8. **Measure.** Search Console (queries, Discover, Google News), Bing's AI performance report, and your CDN logs for `OAI-SearchBot`, `PerplexityBot`, `ClaudeBot` hits. Ask ChatGPT, Perplexity and Gemini the questions your readers ask, and see whether you are cited.

## How to check the build yourself

```bash
pnpm build:reader && pnpm serve:reader      # builds, then serves dist/ like a static host (http://localhost:4173)
curl -s localhost:4173/story/<slug> | grep -E "<title>|canonical|hreflang|ld\+json"
curl -s localhost:4173/robots.txt
curl -s localhost:4173/llms.txt
curl -si localhost:4173/not-a-page | head -1                 # HTTP/1.1 404
```

Then paste a story URL into Google's Rich Results Test and the Schema.org validator once the site is live.

## Configuration

| Variable (Reader build) | Purpose |
|---|---|
| `VITE_SITE_URL` | The public origin. Used in canonical links, sitemaps, feeds and structured data. Required. |
| `SNAPSHOT_URL` | Where the build reads stories from: `https://api.example.com/api/snapshot`. Without it, the build reads `apps/api/content` (offline). |
| `AI_TRAINING` | `allow` or `block` for model-training crawlers in `robots.txt`. |
| `VITE_CONTACT_EMAIL` | Shown on the Contact page and in the organisation data. |
