/**
 * Regenerates the brand images in public/ (favicons, app icons, default link-preview image).
 *   node tools/make-icons.mjs
 * Uses the system Edge/Chrome through playwright-core, so no browser download is needed.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
mkdirSync(out, { recursive: true })

const BLUE = '#2563EB'
const mark = (size, radius) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64"><rect width="64" height="64" rx="${radius}" fill="${BLUE}"/><path d="M19 47V17h6l14 20V17h6v30h-6L25 27v20z" fill="#fff"/></svg>`

writeFileSync(join(out, 'favicon.svg'), mark(64, 14) + '\n')

const og = `<!doctype html><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;width:1200px;height:630px;background:linear-gradient(135deg,#1D4ED8,#2563EB 55%,#0EA5E9);color:#fff;font-family:Inter,'Segoe UI',system-ui,sans-serif;display:grid;align-content:center;padding:0 90px;gap:22px}
  .brand{display:flex;align-items:center;gap:22px}.logo{width:96px;height:96px}
  h1{margin:0;font-size:84px;letter-spacing:-.02em;line-height:1}
  p{margin:0;font-size:40px;line-height:1.3;max-width:900px;opacity:.95}
  .hi{font-family:'Nirmala UI','Noto Sans Devanagari',sans-serif;opacity:.85;font-size:36px}
  .pills{display:flex;gap:12px;margin-top:10px}.pills span{padding:8px 18px;border:2px solid rgba(255,255,255,.55);border-radius:999px;font-size:24px}
</style>
<div class="brand"><div class="logo">${mark(96, 22).replace('fill="#2563EB"', 'fill="#fff"').replace('fill="#fff"/>', 'fill="#fff"/>').replace('d="M19', 'fill="#2563EB" d="M19')}</div><h1>News APP</h1></div>
<p>Ranchi and Jharkhand news, clearly explained.</p>
<p class="hi">रांची और झारखंड की ख़बरें, अंग्रेज़ी और हिंदी में</p>
<div class="pills"><span>Ranchi</span><span>Jharkhand</span><span>India</span><span>World</span></div>`

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'msedge' })
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
await page.setContent(og)
await page.screenshot({ path: join(out, 'og-default.png') })

for (const [name, size, radius] of [['favicon-32.png', 32, 7], ['apple-touch-icon.png', 180, 0], ['icon-192.png', 192, 0], ['icon-512.png', 512, 0]]) {
  const p = await browser.newPage({ viewport: { width: size, height: size } })
  await p.setContent(`<body style="margin:0;background:${BLUE}">${mark(size, radius).replace(/<rect[^>]*>/, `<rect width="64" height="64" rx="${(radius / size) * 64}" fill="${BLUE}"/>`)}</body>`)
  await p.screenshot({ path: join(out, name), omitBackground: radius > 0 })
}
await browser.close()

writeFileSync(
  join(out, 'manifest.webmanifest'),
  JSON.stringify(
    {
      name: 'News APP',
      short_name: 'News APP',
      description: 'Ranchi and Jharkhand news in English and Hindi',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#2563EB',
      lang: 'en-IN',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
    null,
    2,
  ) + '\n',
)
console.log('wrote brand images to', out)
