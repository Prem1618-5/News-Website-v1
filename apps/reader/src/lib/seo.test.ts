import { describe, expect, it } from 'vitest'
import { buildArtifacts } from '@/build/artifacts'
import { blocksText } from '@/lib/blocks'
import { headElements, headHtml } from '@/lib/head'
import { fallbackFor, keysFor, resolveKey } from '@/lib/prefetch'
import { articleLd, clip, storyHead, storyMarkdown } from '@/lib/seo'
import { SECTIONS, SECTION_ICON } from '@/lib/taxonomy'
import { snapshot, story } from '@/test/fixtures'
import type { Page, StoryDetail } from '@/lib/types'

const snap = snapshot()

describe('story head', () => {
  it('has canonical, hreflang pairs, markdown alternate and NewsArticle data', () => {
    const els = headElements(storyHead(story(), 'en'))
    const link = (rel: string) => els.filter((e) => e.tag === 'link' && e.attrs.rel === rel)
    expect(link('canonical')[0].attrs.href).toMatch(/\/story\/ranchi-airport-ready$/)
    expect(link('alternate').map((e) => e.attrs.hreflang).filter(Boolean)).toEqual(['en-IN', 'hi-IN', 'x-default'])
    expect(link('alternate').some((e) => e.attrs.type === 'text/markdown')).toBe(true)
    const ld = els.filter((e) => e.tag === 'script').map((e) => JSON.parse(e.text!))
    expect(ld.map((x) => x['@type'])).toEqual(['NewsArticle', 'BreadcrumbList'])
    expect(ld[0]).toMatchObject({ inLanguage: 'en-IN', isAccessibleForFree: true, articleSection: 'Business' })
    expect(ld[0].citation[0].name).toBe('The CSR Journal')
  })

  it('serves the Hindi page its own URL, language and title', () => {
    const h = storyHead(story(), 'hi')
    expect(h.path).toBe('/hi/story/ranchi-airport-ready')
    expect(h.lang).toBe('hi')
    expect(h.title).toContain('रांची हवाई अड्डा')
    expect((articleLd(story(), 'hi') as { inLanguage: string }).inLanguage).toBe('hi-IN')
  })

  it('cannot be broken out of its script tag by a headline', () => {
    const html = headHtml(storyHead(story({ title: 'x </script><script>alert(1)</script>' }), 'en'))
    expect(html).not.toContain('</script><script>alert')
    expect(html.match(/<\/script>/g)?.length).toBe(2)
  })

  it('clips long text on a word boundary', () => {
    expect(clip('word '.repeat(100), 40).length).toBeLessThanOrEqual(40)
    expect(clip('short', 40)).toBe('short')
  })
})

describe('prefetch mirrors the API', () => {
  it('lists newest first and honours section, exclude and limit', () => {
    const all = resolveKey(snap, '/stories?limit=40') as Page
    expect(all.items.map((s) => s.slug)).toEqual(['ranchi-airport-ready', 'bus-overturns', 'hindi-only'])
    expect((all.items[0] as unknown as StoryDetail).body).toBeUndefined()
    const safety = resolveKey(snap, '/stories?section=safety&limit=40') as Page
    expect(safety.items).toHaveLength(1)
    expect((resolveKey(snap, '/stories?exclude=ranchi-airport-ready&limit=1') as Page).items[0].slug).toBe('bus-overturns')
  })

  it('embeds only what a page uses', () => {
    expect(keysFor('/story/bus-overturns', snap)).toHaveLength(3)
    expect(Object.keys(fallbackFor('/hi/story/bus-overturns', snap))[0]).toBe('/stories/bus-overturns')
    expect(keysFor('/login', snap)).toEqual([])
    expect(keysFor('/story/missing', snap)).toEqual([])
  })
})

describe('taxonomy', () => {
  it('has an icon for every desk and plain positive names for the new ones', () => {
    for (const s of SECTIONS) expect(SECTION_ICON[s.key]).toBeTruthy()
    expect(SECTIONS.map((s) => s.en)).toEqual(expect.arrayContaining(['Health', 'Safety', 'Justice']))
    expect(SECTIONS.map((s) => s.en.toLowerCase())).not.toContain('crime')
  })
})

describe('build artifacts', () => {
  const files = buildArtifacts(snap, { aiTraining: 'allow', now: new Date('2026-10-19T08:00:00Z') })

  it('writes a sitemap with hreflang alternates and no private pages', () => {
    expect(files['sitemap.xml']).toContain('hreflang="hi-IN"')
    expect(files['sitemap.xml']).toContain('/story/ranchi-airport-ready')
    expect(files['sitemap.xml']).not.toMatch(/\/(login|account|saved|states)/)
  })

  it('news sitemap only has stories from the last two days', () => {
    expect(files['news-sitemap.xml']).toContain('ranchi-airport-ready')
    expect(files['news-sitemap.xml']).not.toContain('hindi-only')
  })

  it('robots.txt welcomes answer engines and follows the training policy', () => {
    expect(files['robots.txt']).toMatch(/User-agent: OAI-SearchBot[\s\S]*Allow: \//)
    expect(files['robots.txt']).toContain('Content-Signal: search=yes, ai-input=yes, ai-train=yes')
    const blocked = buildArtifacts(snap, { aiTraining: 'block', now: new Date() })['robots.txt']
    expect(blocked).toMatch(/User-agent: GPTBot[\s\S]*?Disallow: \/\n/)
    expect(blocked).toMatch(/User-agent: PerplexityBot[\s\S]*?Allow: \//)
  })

  it('offers llms.txt, full text and a Markdown copy per story', () => {
    expect(files['llms.txt']).toContain('/story/ranchi-airport-ready.md')
    expect(files['llms-full.txt']).toContain('# Ranchi airport says it is ready')
    expect(files['story/bus-overturns.md']).toContain('# Bus overturns on NH-33')
    expect(files['rss.xml']).toContain('<item>')
    expect(JSON.parse(files['feed.json']).items).toHaveLength(3)
  })

  it('markdown keeps Hindi text and sources', () => {
    const md = storyMarkdown(story())
    expect(md).toContain('## Sources')
    expect(md).toContain('हवाई अड्डा तैयार है।')
    expect(blocksText(story().body)).toContain('Customs and immigration')
  })
})
