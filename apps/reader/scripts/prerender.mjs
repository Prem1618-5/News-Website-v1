#!/usr/bin/env node
/**
 * Static prerender: turns the built SPA into one real HTML file per page, so search engines and AI agents that do
 * not run JavaScript still get the full story, its metadata and its structured data. The browser then hydrates it.
 *
 *   vite build            -> dist/ (client bundle + index.html template)
 *   node scripts/prerender.mjs
 *     1. builds the server entry (.ssr/)
 *     2. loads the data snapshot: SNAPSHOT_URL (the live API) or, offline, apps/api/content via the Python parser
 *     3. renders every page, writes dist/<path>/index.html, 404.html, sitemaps, feeds, robots.txt, llms.txt, *.md
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const env = process.env

// One variable for site URL, shared with the client bundle (read as import.meta.env.VITE_SITE_URL).
env.VITE_SITE_URL = (env.VITE_SITE_URL || env.SITE_URL || 'http://localhost:4173').replace(/\/+$/, '')
const siteIsPlaceholder = /localhost|example\.(com|org)/.test(env.VITE_SITE_URL)
if (siteIsPlaceholder) {
  console.warn(`\n⚠  VITE_SITE_URL is "${env.VITE_SITE_URL}". Canonical links, sitemaps and feeds will point there.\n   Set it to your real domain before building for production.\n`)
  if (env.CI || env.CF_PAGES || env.VERCEL || env.NETLIFY || env.RENDER) {
    console.error('Refusing to build a production site with a placeholder VITE_SITE_URL.')
    process.exit(1)
  }
}

async function loadSnapshot() {
  if (env.SNAPSHOT_URL) {
    const res = await fetch(env.SNAPSHOT_URL, { headers: { accept: 'application/json' } })
    if (!res.ok) throw new Error(`SNAPSHOT_URL answered ${res.status}`)
    console.log(`data: ${env.SNAPSHOT_URL}`)
    return res.json()
  }
  const script = join(root, '..', 'api', 'app', 'content_pack.py')
  if (!existsSync(script)) throw new Error('No SNAPSHOT_URL and apps/api/app/content_pack.py not found.')
  for (const py of [env.PYTHON, 'python3', 'python', 'py'].filter(Boolean)) {
    const r = spawnSync(py, ['-X', 'utf8', script, '--snapshot'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, env: { ...env, PYTHONUTF8: '1' } })
    if (r.status === 0 && r.stdout.trim().startsWith('{')) {
      console.log('data: apps/api/content (offline build)')
      return JSON.parse(r.stdout)
    }
  }
  throw new Error('Could not run Python to read apps/api/content. Install Python 3.11+, or set SNAPSHOT_URL to a running API.')
}

console.log('prerender: building server entry…')
rmSync(join(root, '.ssr'), { recursive: true, force: true })
await build({ root, logLevel: 'warn', build: { ssr: 'src/entry-server.tsx', outDir: '.ssr', emptyOutDir: true, target: 'node20', copyPublicDir: false } })
const server = await import(pathToFileURL(join(root, '.ssr', 'entry-server.js')).href)

const snap = await loadSnapshot()
const template = readFileSync(join(dist, 'index.html'), 'utf8')
const manifestPath = join(dist, '.vite', 'manifest.json')
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {}

/** Screen chunk (and its shared imports) for a URL, so the browser fetches it in parallel with the HTML parse. */
const SCREEN = { '': 'Today', story: 'Article', hi: 'Article', section: 'Section', writer: 'Writer', categories: 'Categories', about: 'Info/About', 'editorial-standards': 'Info/Standards', contact: 'Info/Contact', privacy: 'Info/Privacy', search: 'Search', following: 'Following', saved: 'Saved', notifications: 'Notifications', account: 'Account', location: 'Location', landing: 'Landing', login: 'Login', signup: 'Signup', 'forgot-password': 'Forgot', 'reset-password': 'ResetPassword', onboarding: 'Onboarding' }
function preloads(url) {
  const name = SCREEN[url.split('/').filter(Boolean)[0] ?? '']
  const entry = name && (manifest[`src/screens/${name}/index.tsx`] ?? manifest[`src/screens/${name}.tsx`])
  if (!entry) return ''
  const files = new Set()
  const walk = (e) => {
    if (!e || files.has(e.file)) return
    files.add(e.file)
    for (const k of e.imports ?? []) walk(manifest[k])
  }
  walk(entry)
  const main = Object.values(manifest).find((m) => m.isEntry)?.file
  return [...files].filter((f) => f !== main).map((f) => `<link rel="modulepreload" crossorigin href="/${f}">`).join('\n')
}

const LS = String.fromCharCode(0x2028)
const PS = String.fromCharCode(0x2029)
const jsonForHtml = (v) => JSON.stringify(v).replace(/</g, '\\u003c').split(LS).join('\\u2028').split(PS).join('\\u2029')

function write(rel, content) {
  const file = join(dist, rel)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, content)
}

async function page(url, { spa = false } = {}) {
  const fallback = server.fallbackFor(url, snap)
  const { html, head } = await server.render(url, fallback)
  if (!html.trim()) throw new Error(`empty render for ${url}`)
  let out = template
    .replace('<html lang="en">', () => `<html lang="${head?.lang ?? 'en'}">`)
    .replace('<!--app-head-->', () => `${head ? server.headHtml(head) : '<title>News APP</title>'}\n${preloads(url)}`)
    .replace('<!--app-html-->', () => html)
    .replace('<!--app-data-->', () => (Object.keys(fallback).length ? `<script>window.__DATA__=${jsonForHtml(fallback)}</script>` : ''))
  if (spa) out = out.replace('<div id="root">', '<div id="root" data-spa>')
  return { out, head }
}

// ── Pages ──
const urls = new Set(server.ROUTES.filter((r) => !r.path.includes(':') && r.path !== '/404').map((r) => r.path))
for (const sec of snap.sections) urls.add(`/section/${sec.key}`)
for (const slug of server.authorSlugs(snap)) urls.add(`/writer/${slug}`)
for (const s of snap.stories) {
  urls.add(`/story/${s.slug}`)
  if (s.has_hi) urls.add(`/hi/story/${s.slug}`)
}

let count = 0
const problems = []
for (const url of urls) {
  const { out, head } = await page(url)
  if (!head) problems.push(`${url}: no <Seo> head`)
  write(url === '/' ? 'index.html' : join(url, 'index.html'), out)
  count++
}
write('404.html', (await page('/404', { spa: true })).out)

// ── Sitemaps, feeds, robots.txt, llms.txt, Markdown copies, host headers ──
const files = server.buildArtifacts(snap, { aiTraining: env.AI_TRAINING === 'block' ? 'block' : 'allow', now: new Date() })
for (const [rel, content] of Object.entries(files)) write(rel, content)

rmSync(join(root, '.ssr'), { recursive: true, force: true })

const noindexed = snap.sections.filter((s) => !snap.stories.some((st) => st.section === s.key)).length
console.log(`prerender: ${count} pages + 404.html, ${Object.keys(files).length} files (${snap.stories.length} stories, ${snap.sections.length} desks, ${noindexed} empty desks set to noindex)`)
if (problems.length) {
  console.error(problems.join('\n'))
  process.exit(1)
}
