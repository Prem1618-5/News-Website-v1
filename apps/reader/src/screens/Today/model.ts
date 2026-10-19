import { useState } from 'react'
import { districtName, stateName } from '@news/contracts'
import { authorsOf } from '@/components/story/writers'
import { useConsentState } from '@/lib/consent'
import { useFeed } from '@/lib/data'
import { fmtLongDate } from '@/lib/format'
import { useMounted, useToday } from '@/lib/hooks'
import { useLibrary } from '@/lib/library'
import type { ScopeKey, Story } from '@/lib/types'

/** Which stories go where on Today. Every story appears once; blocks are skipped when there is nothing for them. */
export function useTodayModel() {
  const feed = useFeed()
  const { follow, lang, place } = useLibrary()
  const { choices } = useConsentState()
  const [scope, setScope] = useState<ScopeKey>('local')
  // The API already ranks the feed for this place (local, then state, then national and world).
  const all = feed.stories
  const isLocal = (s: Story) => s.scope === 'local' && s.state === place.state && (!place.district || s.district === place.district)
  const inState = (s: Story) => (s.scope === 'local' || s.scope === 'state') && s.state === place.state
  const matches = (s: Story, k: ScopeKey) => (k === 'local' ? isLocal(s) : k === 'state' ? inState(s) : s.scope === k)
  const top = all.find((s) => s.breaking) ?? all.find((s) => matches(s, scope)) ?? all[0]
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
  const near = take(isLocal, 3)
  const latest = take(() => true, 3)
  const spotlight = take(() => true, 2)
  const picture = take(() => true, 1)[0]
  // Picks from followed desks only with the reader's consent to personalisation.
  const mounted = useMounted()
  const personal = mounted && !!choices?.personalization
  const forYou = [...take((s) => personal && follow.includes(s.section), 2)]
  if (forYou.length < 2) forYou.push(...take(() => true, 2 - forYou.length))
  const today = useToday(all[0]?.published_at ?? '2026-01-01T00:00:00Z')
  return {
    feed, scope, setScope, top, near, latest, spotlight, picture, forYou, personal,
    breaking: all.filter((s) => s.breaking),
    placeName: districtName(place.state, place.district, lang) || stateName(place.state, lang),
    writers: authorsOf(all).slice(0, 3),
    followed: follow,
    dateLabel: fmtLongDate(today, lang),
    lang,
  }
}
