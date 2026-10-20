/**
 * Everything crawlers and AI agents read besides the pages themselves: sitemaps, feeds, robots.txt, llms.txt,
 * Markdown copies of stories, and the static host's header rules. Pure functions of the snapshot, run at build time.
 */
import { storyPath } from '@/lib/format'
import { clip, describeStory, storyMarkdown } from '@/lib/seo'
import { SECTIONS, section, sectionAbout, sectionName } from '@/lib/taxonomy'
import type { Language, Snapshot, StoryDetail } from '@/lib/types'
import { SITE, abs } from '@/site'

export type ArtifactOptions = { aiTraining: 'allow' | 'block'; now: Date }
export type Files = Record<string, string>

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const newest = (stories: StoryDetail[]) => [...stories].sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''))
const modified = (s: StoryDetail) => s.updated_at ?? s.published_at ?? undefined

/** Paths that exist for the app, not for search: kept out of results and out of the sitemap. */
export const PRIVATE_PATHS = ['/account', '/login', '/signup', '/forgot-password', '/reset-password', '/auth/', '/neon-account/', '/onboarding', '/following', '/saved', '/notifications', '/search', '/location', '/landing', '/states/', '/design-system']

export function staticPages(snap: Snapshot): { path: string; lastmod?: string }[] {
  const latest = newest(snap.stories)[0]
  const pages: { path: string; lastmod?: string }[] = [{ path: '/', lastmod: latest && modified(latest) }, { path: '/categories' }]
  for (const sec of SECTIONS) {
    const inSection = newest(snap.stories.filter((s) => s.section === sec.key))
    if (inSection.length) pages.push({ path: `/section/${sec.key}`, lastmod: modified(inSection[0]) })
  }
  for (const slug of authorSlugs(snap)) pages.push({ path: `/writer/${slug}` })
  for (const p of ['/about', '/editorial-standards', '/contact', '/privacy']) pages.push({ path: p })
  return pages
}

export const authorSlugs = (snap: Snapshot) => [...new Set(snap.stories.map((s) => s.author_slug).filter(Boolean))]

function sitemap(snap: Snapshot): string {
  const urls: string[] = []
  const add = (path: string, lastmod?: string, alternates?: [string, string][]) =>
    urls.push(
      `<url><loc>${xml(abs(path))}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}${(alternates ?? [])
        .map(([l, p]) => `<xhtml:link rel="alternate" hreflang="${l}" href="${xml(abs(p))}"/>`)
        .join('')}</url>`,
    )
  for (const p of staticPages(snap)) add(p.path, p.lastmod)
  for (const s of newest(snap.stories)) {
    const alt: [string, string][] | undefined = s.has_hi ? [['en-IN', storyPath(s)], ['hi-IN', storyPath(s, 'hi')], ['x-default', storyPath(s)]] : undefined
    add(storyPath(s), modified(s), alt)
    if (s.has_hi) add(storyPath(s, 'hi'), modified(s), alt)
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`
}

/** Google News sitemap: stories from the last two days only, as the format requires. */
function newsSitemap(snap: Snapshot, now: Date): string {
  const cutoff = now.getTime() - 2 * 24 * 3600 * 1000
  const items: string[] = []
  for (const s of newest(snap.stories)) {
    if (!s.published_at || new Date(s.published_at).getTime() < cutoff) continue
    const entry = (lang: Language) =>
      `<url><loc>${xml(abs(storyPath(s, lang)))}</loc><news:news><news:publication><news:name>${xml(SITE.name)}</news:name><news:language>${lang}</news:language></news:publication><news:publication_date>${s.published_at}</news:publication_date><news:title>${xml(lang === 'hi' ? s.title_hi : s.title)}</news:title></news:news></url>`
    items.push(entry(s.language === 'hi' && !s.has_hi ? 'hi' : 'en'))
    if (s.has_hi) items.push(entry('hi'))
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${items.join('\n')}\n</urlset>\n`
}

function rss(stories: StoryDetail[], opts: { title: string; path: string; lang: Language; description: string }): string {
  const hi = opts.lang === 'hi'
  const items = stories
    .slice(0, 30)
    .map((s) => {
      const url = abs(storyPath(s, hi && s.has_hi ? 'hi' : 'en'))
      return `<item><title>${xml(hi && s.title_hi ? s.title_hi : s.title)}</title><link>${xml(url)}</link><guid isPermaLink="true">${xml(url)}</guid>${s.published_at ? `<pubDate>${new Date(s.published_at).toUTCString()}</pubDate>` : ''}<dc:creator>${xml(s.author)}</dc:creator><category>${xml(sectionName(s.section, opts.lang))}</category><description>${xml(describeStory(s, hi && s.has_hi ? 'hi' : 'en'))}</description></item>`
    })
    .join('\n')
  const built = stories[0]?.published_at ? new Date(stories[0].published_at).toUTCString() : new Date(0).toUTCString()
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">\n<channel><title>${xml(opts.title)}</title><link>${xml(abs('/'))}</link><description>${xml(opts.description)}</description><language>${hi ? 'hi-IN' : 'en-IN'}</language><lastBuildDate>${built}</lastBuildDate><atom:link href="${xml(abs(opts.path))}" rel="self" type="application/rss+xml"/>\n${items}\n</channel>\n</rss>\n`
}

function jsonFeed(stories: StoryDetail[]): string {
  return JSON.stringify(
    {
      version: 'https://jsonfeed.org/version/1.1',
      title: SITE.name,
      home_page_url: abs('/'),
      feed_url: abs('/feed.json'),
      description: SITE.description,
      language: 'en-IN',
      items: stories.slice(0, 50).map((s) => ({
        id: abs(storyPath(s)),
        url: abs(storyPath(s)),
        title: s.title,
        summary: describeStory(s, 'en'),
        date_published: s.published_at,
        date_modified: modified(s),
        authors: [{ name: s.author }],
        tags: [sectionName(s.section)],
        language: 'en-IN',
      })),
    },
    null,
    2,
  )
}

/** AI crawlers by purpose. Retrieval and answer-engine agents are always welcome; model-training crawlers follow AI_TRAINING. */
const RETRIEVAL_BOTS = ['OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Perplexity-User', 'Claude-SearchBot', 'Claude-User', 'DuckAssistBot', 'MistralAI-User', 'Applebot', 'Bingbot', 'Googlebot', 'Googlebot-News']
const TRAINING_BOTS = ['GPTBot', 'ClaudeBot', 'anthropic-ai', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'cohere-ai', 'Meta-ExternalAgent', 'Bytespider', 'Amazonbot']

function robots(training: 'allow' | 'block'): string {
  const hide = PRIVATE_PATHS.map((p) => `Disallow: ${p}`).join('\n')
  const group = (bots: string[], rule: string) => `${bots.map((b) => `User-agent: ${b}`).join('\n')}\n${rule}`
  return `# ${SITE.name}: public news site. Private app pages and design previews are not for indexing.
User-agent: *
Content-Signal: search=yes, ai-input=yes, ai-train=${training === 'allow' ? 'yes' : 'no'}
Allow: /
${hide}

# Search and answer engines, and agents browsing on a reader's behalf.
${group(RETRIEVAL_BOTS, `Allow: /\n${hide}`)}

# Crawlers that collect text to train AI models (policy set by AI_TRAINING at build time: ${training}).
${group(TRAINING_BOTS, training === 'allow' ? `Allow: /\n${hide}` : 'Disallow: /')}

Sitemap: ${abs('/sitemap.xml')}
Sitemap: ${abs('/news-sitemap.xml')}
`
}

function llmsTxt(snap: Snapshot): string {
  const latest = newest(snap.stories)
  const bySection = SECTIONS.map((sec) => ({ sec, items: latest.filter((s) => s.section === sec.key) })).filter((g) => g.items.length)
  const md = (s: StoryDetail) => `- [${s.title}](${abs(`/story/${encodeURIComponent(s.slug)}.md`)}): ${clip(describeStory(s, 'en'), 140)}`
  return `# ${SITE.name}

> ${SITE.description} Every story is available in English and Hindi, names its sources and links to them. Stories are rewritten in our own words from published reports; corrections follow the policy at ${abs('/editorial-standards')}.

Each link below is a plain-Markdown copy of the story (English, followed by Hindi where available). The same stories are on the website as HTML with structured data.

## Latest
${latest.slice(0, 15).map(md).join('\n')}

${bySection.map(({ sec, items }) => `## ${sec.en}\n${sectionAbout(sec.key)}\n${items.slice(0, 10).map(md).join('\n')}`).join('\n\n')}

## About this site
- [About](${abs('/about')}): who we are and what we cover
- [Editorial standards](${abs('/editorial-standards')}): sourcing, labelling and corrections
- [Contact](${abs('/contact')}): tips and corrections
- [RSS feed](${abs('/rss.xml')}) · [JSON feed](${abs('/feed.json')}) · [Sitemap](${abs('/sitemap.xml')})

## Optional
- [Full text of every story](${abs('/llms-full.txt')})
`
}

const FULL_LIMIT = 1_500_000

function llmsFull(snap: Snapshot): string {
  const parts = [`# ${SITE.name}: all stories\n\n> ${SITE.description}\n`]
  let size = parts[0].length
  for (const s of newest(snap.stories)) {
    const block = `\n---\n\n${storyMarkdown(s)}`
    if (size + block.length > FULL_LIMIT) break
    parts.push(block)
    size += block.length
  }
  return parts.join('')
}

/** Cloudflare Pages / Netlify format. Other hosts can translate these few rules. */
function hostHeaders(): string {
  return `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  X-Frame-Options: SAMEORIGIN
  Strict-Transport-Security: max-age=63072000; includeSubDomains
  Cache-Control: public, max-age=0, s-maxage=300, stale-while-revalidate=86400

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/sw.js
  Cache-Control: no-cache

/newsroom/*
  ! Permissions-Policy
  Permissions-Policy: camera=(self), microphone=(self), geolocation=()
  X-Robots-Tag: noindex

/newsroom/sw.js
  Cache-Control: no-cache

/*.png
  Cache-Control: public, max-age=604800
/favicon.svg
  Cache-Control: public, max-age=604800

/*.md
  Content-Type: text/markdown; charset=utf-8
  X-Robots-Tag: noindex
/llms.txt
  Content-Type: text/plain; charset=utf-8
/llms-full.txt
  Content-Type: text/plain; charset=utf-8
  X-Robots-Tag: noindex
/feed.json
  Content-Type: application/feed+json; charset=utf-8
/rss.xml
  Content-Type: application/rss+xml; charset=utf-8
/rss*.xml
  Content-Type: application/rss+xml; charset=utf-8
`
}

export function buildArtifacts(snap: Snapshot, opts: ArtifactOptions): Files {
  const stories = newest(snap.stories)
  const files: Files = {
    'sitemap.xml': sitemap(snap),
    'news-sitemap.xml': newsSitemap(snap, opts.now),
    'rss.xml': rss(stories, { title: SITE.name, path: '/rss.xml', lang: 'en', description: SITE.description }),
    'rss-hi.xml': rss(stories.filter((s) => s.has_hi), { title: `${SITE.name} (हिंदी)`, path: '/rss-hi.xml', lang: 'hi', description: SITE.descriptionHi }),
    'feed.json': jsonFeed(stories),
    'robots.txt': robots(opts.aiTraining),
    'llms.txt': llmsTxt(snap),
    'llms-full.txt': llmsFull(snap),
    '_headers': hostHeaders(),
  }
  for (const sec of SECTIONS) {
    const items = stories.filter((s) => s.section === sec.key)
    if (items.length) files[`rss/${sec.key}.xml`] = rss(items, { title: `${SITE.name}: ${section(sec.key).en}`, path: `/rss/${sec.key}.xml`, lang: 'en', description: sectionAbout(sec.key) })
  }
  for (const s of stories) files[`story/${s.slug}.md`] = storyMarkdown(s)
  return files
}

