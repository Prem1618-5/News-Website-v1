/**
 * Per-page <head>: title, description, canonical, robots, Open Graph, Twitter, hreflang, JSON-LD.
 *
 * The prerender step collects what <Seo> declares and writes it into the page's static HTML; in the browser
 * <Seo> updates the live <head> on navigation. Both paths use `headElements`, so they cannot drift.
 */
import { createContext, useContext, useEffect } from 'react'
import { SITE, abs } from '@/site'

export type HeadData = {
  title: string
  description: string
  /** Canonical path on this site, e.g. "/story/some-slug". */
  path: string
  lang?: 'en' | 'hi'
  type?: 'website' | 'article'
  /** Absolute or site-relative image for link previews. */
  image?: string
  noindex?: boolean
  /** hreflang alternates as [hreflang, path]. */
  alternates?: [string, string][]
  /** Clean Markdown copy of the page for AI agents. */
  markdown?: string
  published?: string | null
  modified?: string | null
  section?: string
  author?: string
  jsonLd?: object[]
}

export type HeadElement = { tag: 'meta' | 'link' | 'script'; attrs: Record<string, string>; text?: string }

export const DEFAULT_IMAGE = '/og-default.png'
const ROBOTS_INDEX = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'

export const pageTitle = (t: string) => (t.includes(SITE.name) ? t : `${t} · ${SITE.name}`)

export function headElements(h: HeadData): HeadElement[] {
  const url = abs(h.path)
  const image = h.image ? (h.image.startsWith('http') ? h.image : abs(h.image)) : abs(DEFAULT_IMAGE)
  const locale = h.lang === 'hi' ? 'hi_IN' : 'en_IN'
  const meta = (attrs: Record<string, string>): HeadElement => ({ tag: 'meta', attrs })
  const els: HeadElement[] = [
    meta({ name: 'description', content: h.description }),
    meta({ name: 'robots', content: h.noindex ? 'noindex,nofollow' : ROBOTS_INDEX }),
    { tag: 'link', attrs: { rel: 'canonical', href: url } },
    meta({ property: 'og:site_name', content: SITE.name }),
    meta({ property: 'og:type', content: h.type ?? 'website' }),
    meta({ property: 'og:title', content: h.title }),
    meta({ property: 'og:description', content: h.description }),
    meta({ property: 'og:url', content: url }),
    meta({ property: 'og:locale', content: locale }),
    meta({ property: 'og:image', content: image }),
    meta({ property: 'og:image:width', content: '1200' }),
    meta({ property: 'og:image:height', content: '630' }),
    meta({ name: 'twitter:card', content: 'summary_large_image' }),
    meta({ name: 'twitter:title', content: h.title }),
    meta({ name: 'twitter:description', content: h.description }),
    meta({ name: 'twitter:image', content: image }),
  ]
  if (h.type === 'article') {
    if (h.published) els.push(meta({ property: 'article:published_time', content: h.published }))
    if (h.modified) els.push(meta({ property: 'article:modified_time', content: h.modified }))
    if (h.section) els.push(meta({ property: 'article:section', content: h.section }))
    if (h.author) els.push(meta({ property: 'article:author', content: h.author }))
  }
  for (const [hreflang, path] of h.alternates ?? []) els.push({ tag: 'link', attrs: { rel: 'alternate', hreflang, href: abs(path) } })
  if (h.markdown) els.push({ tag: 'link', attrs: { rel: 'alternate', type: 'text/markdown', href: abs(h.markdown) } })
  for (const ld of h.jsonLd ?? []) els.push({ tag: 'script', attrs: { type: 'application/ld+json' }, text: JSON.stringify(ld) })
  return els
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Serialises a page's head tags for static HTML. Marked data-seo so the browser can replace them later. */
export function headHtml(h: HeadData): string {
  const tags = headElements(h).map(({ tag, attrs, text }) => {
    const a = Object.entries(attrs).map(([k, v]) => `${k}="${esc(v)}"`).join(' ')
    // "<" is escaped inside JSON-LD so a headline can never close the script element.
    return tag === 'script' ? `<script ${a} data-seo>${(text ?? '').replace(/</g, '\\u003c')}</script>` : `<${tag} ${a} data-seo>`
  })
  return `<title>${esc(h.title)}</title>\n${tags.join('\n')}`
}

function applyHead(h: HeadData) {
  document.title = h.title
  document.documentElement.lang = h.lang ?? 'en'
  document.head.querySelectorAll('[data-seo]').forEach((n) => n.remove())
  for (const { tag, attrs, text } of headElements(h)) {
    const el = document.createElement(tag)
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    if (text) el.textContent = text
    el.setAttribute('data-seo', '')
    document.head.appendChild(el)
  }
}

/** Filled while prerendering; the last <Seo> rendered wins. */
export type HeadCollector = { current: HeadData | null }
export const HeadContext = createContext<HeadCollector | null>(null)

export function Seo(props: HeadData) {
  const collector = useContext(HeadContext)
  if (collector) collector.current = props
  const serialised = JSON.stringify(props)
  useEffect(() => applyHead(props), [serialised]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}
