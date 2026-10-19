import { useState } from 'react'
import { useSection } from '@/lib/data'
import { useLibrary } from '@/lib/library'
import { section, sectionAbout, sectionName } from '@/lib/taxonomy'
import type { ScopeKey, SectionKey } from '@/lib/types'

const PAGE = 12
const FETCH = 40

export function useSectionModel(key: SectionKey) {
  const [shown, setShown] = useState(PAGE)
  // Fetch in steps of 40 as the reader goes further down; the first step is prerendered.
  const feed = useSection(key, Math.max(FETCH, Math.ceil(shown / FETCH) * FETCH))
  const { lang } = useLibrary()
  const [scope, setScope] = useState<ScopeKey | 'all'>('all')
  const filtered = scope === 'all' ? feed.stories : feed.stories.filter((s) => s.scope === scope)
  return {
    feed, lang, scope, setScope: (k: ScopeKey | 'all') => (setScope(k), setShown(PAGE)),
    stories: filtered.slice(0, shown),
    total: scope === 'all' ? feed.total : filtered.length,
    more: filtered.length > shown || (scope === 'all' && feed.total > shown),
    loadMore: () => setShown((n) => n + PAGE),
    info: section(key),
    name: sectionName(key, lang),
    about: sectionAbout(key, lang),
  }
}
