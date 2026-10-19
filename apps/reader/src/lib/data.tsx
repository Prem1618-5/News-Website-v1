import type { ReactNode } from 'react'
import useSWR, { SWRConfig } from 'swr'
import { DEFAULT_LOCATION } from '@news/contracts'
import { api } from './api'
import { placeKey, usePlace, type Place } from './library'
import type { Page, Story, StoryDetail } from './types'

/** SWR keys. The prerender step fills the same keys (see prefetch.ts), so the first paint already has data. */
export const SECTIONS_KEY = '/sections'
/** Front-page feed for a place: the API ranks local, then state, then national and world news. */
export const feedKey = (place: Place) => `/stories?limit=40&near=${encodeURIComponent(placeKey(place))}`
/** The feed the static build prerenders (the newsroom's home market). */
export const FEED = feedKey(DEFAULT_LOCATION)
export const sectionKey = (k: string, limit = 40) => `/stories?section=${encodeURIComponent(k)}&limit=${limit}`
export const authorKey = (slug: string) => `/stories?author=${encodeURIComponent(slug)}&limit=40`
export const storyKey = (slug: string) => `/stories/${encodeURIComponent(slug)}`
export const moreKey = (slug: string) => `/stories?exclude=${encodeURIComponent(slug)}&limit=6`
export const relatedKey = (slug: string, section: string) =>
  `/stories?section=${encodeURIComponent(section)}&exclude=${encodeURIComponent(slug)}&limit=3`
export const searchKey = (q: string) => `/stories?q=${encodeURIComponent(q)}&limit=30`
export const idsKey = (ids: string[]) => `/stories?ids=${ids.map(encodeURIComponent).join(',')}&limit=100`

export function DataProvider({ fallback, children }: { fallback?: Record<string, unknown>; children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: (key: string) => api(key),
        fallback: fallback ?? {},
        revalidateOnFocus: false,
        dedupingInterval: 20_000,
        errorRetryCount: 2,
      }}
    >
      {children}
    </SWRConfig>
  )
}

export type Feed = { stories: Story[]; total: number; loading: boolean; error: boolean; retry: () => void }

function useList(key: string | null): Feed {
  const { data, error, isLoading, mutate } = useSWR<Page>(key, null, { keepPreviousData: true })
  return {
    stories: data?.items ?? [],
    total: data?.total ?? 0,
    loading: !!key && isLoading && !data,
    error: !data && !!error,
    retry: () => void mutate(),
  }
}

export function useFeed() {
  return useList(feedKey(usePlace()))
}

/** Story count per desk. */
export function useSectionCounts(): Record<string, number> {
  const { data } = useSWR<{ key: string; count: number }[]>(SECTIONS_KEY)
  return Object.fromEntries((data ?? []).map((s) => [s.key, s.count]))
}
/** A desk's stories; `limit` grows with "Load more" (the first 40 are prerendered). */
export const useSection = (k: string, limit = 40) => useList(sectionKey(k, limit))
export const useAuthor = (slug: string) => useList(authorKey(slug))
export const useMore = (slug: string) => useList(moreKey(slug))
export const useRelated = (slug: string, section: string) => useList(relatedKey(slug, section))
export const useSearch = (q: string) => useList(q.trim().length >= 2 ? searchKey(q.trim()) : null)
export const useStoriesByIds = (ids: string[]) => useList(ids.length ? idsKey(ids) : null)

export function useStory(slug: string) {
  const { data, error, isLoading, mutate } = useSWR<StoryDetail>(slug ? storyKey(slug) : null)
  return {
    story: data,
    loading: isLoading && !data,
    notFound: !data && (error as { status?: number } | undefined)?.status === 404,
    error: !data && !!error && (error as { status?: number }).status !== 404,
    retry: () => void mutate(),
  }
}
