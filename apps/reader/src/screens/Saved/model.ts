import { useStoriesByIds } from '@/lib/data'
import { library, useLibrary, type Highlight } from '@/lib/library'
import type { Story } from '@/lib/types'

export function useSavedModel() {
  const { saved, hl, lang } = useLibrary()
  const ids = [...new Set([...saved, ...hl.map((h) => h.id)])]
  const feed = useStoriesByIds(ids)
  const byId = new Map<string, Story>(feed.stories.flatMap((s) => [[s.id, s], [s.slug, s]] as [string, Story][]))
  return {
    feed, lang, hl, ids,
    stories: saved.map((id) => byId.get(id)).filter((s): s is Story => !!s),
    storyOf: (h: Highlight) => byId.get(h.id),
    removeHighlight: library.removeHighlight,
    nothing: saved.length === 0 && hl.length === 0,
  }
}
