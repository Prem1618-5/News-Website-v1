#!/usr/bin/env node
/**
 * Serves a prerendered build the way a static host does (Cloudflare Pages, Netlify): exact file, then
 * <path>/index.html, otherwise 404.html with a real 404 status. Applies the rules from dist/_headers.
 *   node scripts/serve.mjs dist 4173 [--api http://127.0.0.1:8000]
 * With --api, /api/* is proxied to the Platform API, like the production reverse proxy or CORS setup would allow.
 */
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'

const args = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--api')
const apiTarget = process.argv.includes('--api') ? process.argv[process.argv.indexOf('--api') + 1] : ''
const dir = resolve(args[0] ?? 'dist')
const port = Number(args[1] ?? 4173)
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.webmanifest': 'application/manifest+json' }

// Minimal _headers parser: "/glob" line followed by indented "Name: value" lines.
const rules = []
if (existsSync(join(dir, '_headers'))) {
  let cur
  for (const line of readFileSync(join(dir, '_headers'), 'utf8').split('\n')) {
    if (!line.trim()) continue
    if (!/^\s/.test(line)) rules.push((cur = { re: new RegExp('^' + line.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'), headers: {} }))
    else if (cur) {
      const i = line.indexOf(':')
      cur.headers[line.slice(0, i).trim()] = line.slice(i + 1).trim()
    }
  }
}

const isFile = (p) => existsSync(p) && statSync(p).isFile()

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x')
  if (apiTarget && url.pathname.startsWith('/api/')) {
    try {
      const upstream = await fetch(apiTarget + req.url, { method: req.method, headers: { accept: String(req.headers.accept ?? '*/*'), cookie: String(req.headers.cookie ?? '') } })
      res.writeHead(upstream.status, { 'content-type': upstream.headers.get('content-type') ?? 'application/json' })
      return res.end(Buffer.from(await upstream.arrayBuffer()))
    } catch {
      res.writeHead(502)
      return res.end('API unreachable')
    }
  }
  const path = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\]?\.\.)+/, '')
  let file = join(dir, path)
  let status = 200
  if (!isFile(file)) file = join(dir, path, 'index.html')
  if (!isFile(file)) {
    file = join(dir, '404.html')
    status = 404
  }
  const headers = { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }
  for (const r of rules) if (r.re.test(url.pathname)) Object.assign(headers, Object.fromEntries(Object.entries(r.headers).map(([k, v]) => [k.toLowerCase(), v])))
  res.writeHead(status, headers)
  createReadStream(file).pipe(res)
}).listen(port, () => console.log(`serving ${dir} on http://localhost:${port}`))
