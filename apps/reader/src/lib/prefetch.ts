/**
 * Build-time data for SWR's `fallback`: what the API would answer for the keys a page uses, computed from
 * the snapshot. Keeps prerendered HTML and the first client render identical.
 * Mirrors the filters of GET /api/stories (section, author, exclude, ids, scope, limit); covered by prefetch.test.ts.
 */
import { FEED, SECTIONS_KEY, authorKey, moreKey, relatedKey, sectionKey, storyKey } from './data'
import { isSection } from './taxonomy'
import type { Page, Snapshot, Story, StoryDetail } from './types'

const toStory = ({ body: _b, body_hi: _h, sources: _s, ...story }: StoryDetail): Story => story

const newestFirst = (a: StoryDetail, b: StoryDetail) => (b.published_at ?? '').localeCompare(a.published_at ?? '')

export function resolveKey(snap: Snapshot, key: string): unknown {
  const [path, query = ''] = key.split('?')
  const stories = [...snap.stories].sort(newestFirst)
  if (path === '/sections') return snap.sections
  if (path.startsWith('/stories/')) {
    const ref = decodeURIComponent(path.slice('/stories/'.length))
    return stories.find((s) => s.slug === ref || s.id === ref)
  }
  if (path !== '/stories') return undefined
  const q = new URLSearchParams(query)
  const ids = q.get('ids')?.split(',').filter(Boolean)
  const list = stories.filter(
    (s) =>
      (!q.get('section') || q.get('section')!.split(',').includes(s.section)) &&
      (!q.get('scope') || s.scope === q.get('scope')) &&
      (!q.get('author') || s.author_slug === q.get('author')) &&
      (!q.get('exclude') || (s.slug !== q.get('exclude') && s.id !== q.get('exclude'))) &&
      (!ids || ids.includes(s.id) || ids.includes(s.slug)),
  )
  const limit = Number(q.get('limit') ?? 30)
  return { total: list.length, items: list.slice(0, limit).map(toStory) } satisfies Page
}

/** Which SWR keys a URL needs, so only those are embedded in the page. */
export function keysFor(pathname: string, snap: Snapshot): string[] {
  const parts = pathname.replace(/^\/hi(?=\/)/, '').split('/').filter(Boolean)
  if (parts[0] === 'story' && parts[1]) {
    const slug = decodeURIComponent(parts[1])
    const story = snap.stories.find((s) => s.slug === slug)
    return story ? [storyKey(slug), moreKey(slug), relatedKey(slug, story.section)] : []
  }
  if (parts[0] === 'section' && isSection(parts[1])) return [sectionKey(parts[1])]
  if (parts[0] === 'writer') return [authorKey(parts[1] ?? 'news-app-desk')]
  if (parts[0] === 'categories') return [SECTIONS_KEY]
  if (parts.length === 0) return [FEED]
  return []
}

export function fallbackFor(pathname: string, snap: Snapshot): Record<string, unknown> {
  return Object.fromEntries(keysFor(pathname, snap).map((k) => [k, resolveKey(snap, k)]).filter(([, v]) => v !== undefined))
}
