import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { feedKey } from './data'
import { library, useLibrary } from './library'
import type { Page, Story } from './types'

/** False during prerender and hydration, true afterwards. Gate anything that depends on the browser or the clock. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}

/** Today's date. Prerendered pages show the build's date until the browser takes over, so there is no mismatch. */
export function useToday(buildDate: string): Date {
  const [now, setNow] = useState(() => new Date(buildDate))
  useEffect(() => setNow(new Date()), [])
  return now
}

export type Notice = { id: string; kind: 'breaking' | 'writer' | 'desk' | 'near'; story: Story; unread: boolean }

const NEW_WINDOW_MS = 3 * 24 * 3600 * 1000

/** Notification list built from the live feed and the desks and writers the reader follows. Client-only. */
export function useNotices(): { notices: Notice[]; unread: number; ready: boolean } {
  const mounted = useMounted()
  const { follow, seenAt, place } = useLibrary()
  const { data } = useSWR<Page>(mounted ? feedKey(place) : null)
  if (!mounted || !data) return { notices: [], unread: 0, ready: false }
  const now = Date.now()
  const notices: Notice[] = data.items.slice(0, 30).map((story) => {
    const at = story.published_at ? new Date(story.published_at).getTime() : 0
    const kind: Notice['kind'] =
      story.breaking || story.live ? 'breaking' : follow.includes(`w:${story.author_slug}`) ? 'writer' : follow.includes(story.section) ? 'desk' : story.scope === 'local' && story.district === place.district ? 'near' : 'desk'
    return { id: story.id, kind, story, unread: at > seenAt && now - at < NEW_WINDOW_MS }
  })
  const rank = { breaking: 0, writer: 1, desk: 2, near: 3 } as const
  const followed = (n: Notice) => (n.kind === 'writer' || (n.kind === 'desk' && follow.includes(n.story.section)) ? 0 : 1)
  notices.sort((a, b) => rank[a.kind] - rank[b.kind] || followed(a) - followed(b))
  return { notices, unread: notices.filter((n) => n.unread).length, ready: true }
}

export const markNoticesSeen = () => library.markSeen()
