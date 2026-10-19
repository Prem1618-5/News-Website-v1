import { useState } from 'react'
import { authorsOf } from '@/components/story/writers'
import { useFeed } from '@/lib/data'
import { fmtLongDate } from '@/lib/format'
import { useToday } from '@/lib/hooks'
import { useLibrary } from '@/lib/library'
import type { ScopeKey, Story } from '@/lib/types'

/** Which stories go where on Today. Every story appears once; blocks are skipped when there is nothing for them. */
export function useTodayModel() {
  const feed = useFeed()
  const { follow, lang } = useLibrary()
  const [scope, setScope] = useState<ScopeKey>('ranchi')
  const all = feed.stories
  const top = all.find((s) => s.scope === scope) ?? all[0]
  const used = new Set<string>(top ? [top.id] : [])
  const take = (pred: (s: Story) => boolean, n: number): Story[] => {
    const out: Story[] = []
    for (const s of all) {
      if (out.length >= n) break
      if (!used.has(s.id) && pred(s)) {
        out.push(s)
        used.add(s.id)
      }
    }
    return out
  }
  const near = take((s) => s.scope === 'ranchi', 3)
  const latest = take(() => true, 3)
  const spotlight = take(() => true, 2)
  const picture = take(() => true, 1)[0]
  const forYou = [...take((s) => follow.includes(s.section), 2)]
  if (forYou.length < 2) forYou.push(...take(() => true, 2 - forYou.length))
  const today = useToday(all[0]?.published_at ?? '2026-01-01T00:00:00Z')
  return {
    feed, scope, setScope, top, near, latest, spotlight, picture, forYou,
    writers: authorsOf(all).slice(0, 3),
    followed: follow,
    dateLabel: fmtLongDate(today, lang),
    lang,
  }
}
