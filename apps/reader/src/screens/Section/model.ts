import { useState } from 'react'
import { useSection } from '@/lib/data'
import { useLibrary } from '@/lib/library'
import { section, sectionAbout, sectionName } from '@/lib/taxonomy'
import type { ScopeKey, SectionKey } from '@/lib/types'

const PAGE = 12

export function useSectionModel(key: SectionKey) {
  const feed = useSection(key)
  const { lang } = useLibrary()
  const [scope, setScope] = useState<ScopeKey | 'all'>('all')
  const [shown, setShown] = useState(PAGE)
  const filtered = scope === 'all' ? feed.stories : feed.stories.filter((s) => s.scope === scope)
  return {
    feed, lang, scope, setScope: (k: ScopeKey | 'all') => (setScope(k), setShown(PAGE)),
    stories: filtered.slice(0, shown),
    total: filtered.length,
    more: filtered.length > shown,
    loadMore: () => setShown((n) => n + PAGE),
    info: section(key),
    name: sectionName(key, lang),
    about: sectionAbout(key, lang),
  }
}
