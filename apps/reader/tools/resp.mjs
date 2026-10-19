#!/usr/bin/env node
/**
 * Responsive audit: opens every route at a range of widths and reports
 *   - pages where document.scrollWidth is wider than the viewport (horizontal scroll), and
 *   - visible elements whose right edge is past the viewport (and are not inside an intentional scroller).
 *
 *   node tools/resp.mjs [baseUrl] [--widths 320,360] [--route /about] [--verbose]
 *
 * Uses the installed Edge/Chrome (PW_CHANNEL=chrome to switch). Google Fonts requests are blocked for speed.
 * Needs the site and its API reachable: `pnpm dev` then default base http://localhost:3000, or a prerendered
 * build served with `pnpm serve` (story pages then come from /sitemap.xml). Exits 1 on any failure.
 */
import { chromium } from 'playwright-core'

const args = process.argv.slice(2)
const flag = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const BASE = (args.find((a) => /^https?:/.test(a)) ?? 'http://localhost:3000').replace(/\/$/, '')
const VERBOSE = args.includes('--verbose')
const WIDTHS = (flag('--widths') ?? '320,360,390,414,600,767,768,820,1024,1280,1440,1920,2560').split(',').map(Number)

const SECTIONS = ['world', 'politics', 'business', 'tech', 'sports', 'culture', 'science', 'health', 'safety', 'justice', 'education', 'environment', 'entertainment']
const STATIC = [
  '/', '/landing', '/login', '/signup', '/forgot-password', '/onboarding', '/onboarding/2', '/following', '/following/empty', '/saved', '/saved/empty',
  '/search', '/search/no-results', '/account', '/notifications', '/notifications/empty', '/writer', '/location', '/categories', '/about', '/editorial-standards',
  '/contact', '/privacy', ...SECTIONS.map((s) => `/section/${s}`), '/404',
  '/states/loading', '/states/offline', '/states/load-error', '/states/no-highlights', '/states/feedback', '/design-system',
]

async function storySlug() {
  try {
    const res = await fetch(`${BASE}/api/stories?limit=1`)
    if (res.ok) return (await res.json()).items[0]?.slug
  } catch {
    /* fall through to the sitemap */
  }
  const xml = await (await fetch(`${BASE}/sitemap.xml`)).text()
  return xml.match(/\/story\/([^<"/]+)</)?.[1]
}

const slug = await storySlug()
const routes = flag('--route') ? [flag('--route')] : [...STATIC, ...(slug ? [`/story/${slug}`, `/hi/story/${slug}`] : [])]

/** Runs in the page. Returns elements that stick out past the right edge and are not inside a scroll container. */
function measure() {
  const vw = document.documentElement.clientWidth
  const clipped = (el) => {
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const s = getComputedStyle(p)
      if (/(auto|scroll|hidden|clip)/.test(s.overflowX) && p.scrollWidth >= p.clientWidth) return true
    }
    return false
  }
  const out = []
  for (const el of document.body.querySelectorAll('*')) {
    const s = getComputedStyle(el)
    if (s.display === 'none' || s.visibility === 'hidden' || s.position === 'fixed') continue
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0 || r.right <= vw + 1) continue
    if (clipped(el)) continue
    const tag = `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`
    out.push(`${tag} right=${Math.round(r.right)} (+${Math.round(r.right - vw)})`)
    if (out.length >= 5) break
  }
  return { scrollWidth: document.documentElement.scrollWidth, clientWidth: vw, offenders: out }
}

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'msedge' })
const failures = []
let checked = 0
for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 900 } })
  const page = await ctx.newPage()
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort())
  for (const route of routes) {
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('main, h1, #root > *', { timeout: 8000 }).catch(() => undefined)
    await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => undefined)
    const m = await page.evaluate(measure)
    checked++
    const wide = m.scrollWidth > m.clientWidth
    if (wide || m.offenders.length) failures.push({ width, route, ...m })
    if (VERBOSE) console.log(`${width}\t${route}\t${wide || m.offenders.length ? 'FAIL' : 'ok'}`)
  }
  await ctx.close()
  process.stdout.write(`width ${width}: ${failures.filter((f) => f.width === width).length} failing\n`)
}
await browser.close()

console.log(`\nchecked ${checked} page/width pairs across ${routes.length} routes`)
if (failures.length) {
  for (const f of failures) console.log(`FAIL ${f.width}px ${f.route}: scrollWidth ${f.scrollWidth} vs ${f.clientWidth}; ${f.offenders.join(' | ') || 'no single offender'}`)
  process.exit(1)
}
console.log('no horizontal overflow')
