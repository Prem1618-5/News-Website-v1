/**
 * The reader's own shelf: saved stories, likes, followed desks and writers, highlights, language.
 * Lives in localStorage so it works signed out; when signed in, session.tsx syncs it with the API (/api/reader/state).
 */
import { useSyncExternalStore } from 'react'
import { DEFAULT_LOCATION, districtsOf, STATES, type Place } from '@news/contracts'
import type { Language } from './types'

export type { Place }

export type Highlight = { id: string; t: string; d: string }
export type Library = {
  saved: string[]
  liked: string[]
  /** Desk keys ("health") and writers ("w:news-app-desk"). */
  follow: string[]
  hl: Highlight[]
  lang: Language
  /** Where the reader lives: their district's news comes first, then their state's, then India and the world. */
  place: Place
  /** True once the reader picked a place themselves (until then the newsroom's home market is used). */
  placeChosen: boolean
  /** Time the reader last opened the notification list. */
  seenAt: number
}

const KEY = 'news-reader-v2'
const EMPTY: Library = { saved: [], liked: [], follow: [], hl: [], lang: 'en', place: { ...DEFAULT_LOCATION }, placeChosen: false, seenAt: 0 }

/** A known state, and a district that belongs to it (or none). */
export function validPlace(p: Partial<Place> | null | undefined): Place | null {
  if (!p?.state || !STATES.some((s) => s.code === p.state)) return null
  const district = p.district && districtsOf(p.state).some((d) => d.key === p.district) ? p.district : ''
  return { state: p.state, district }
}

/** "JH:ranchi" (what the API's `near` takes) and back. */
export const placeKey = (p: Place) => (p.district ? `${p.state}:${p.district}` : p.state)
export const parsePlace = (key: string | undefined): Place | null => {
  const [state, district] = (key ?? '').split(':')
  return validPlace({ state, district })
}

let state: Library = EMPTY
const listeners = new Set<() => void>()
let onChange: ((s: Library) => void) | null = null

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* private mode or storage full: the shelf still works for this visit */
  }
}

function set(next: Library, notifyServer = true) {
  state = next
  persist()
  listeners.forEach((l) => l())
  if (notifyServer) onChange?.(state)
}

export function loadLibrary() {
  if (typeof window === 'undefined') return
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Library> | null
    if (raw) state = { ...EMPTY, ...raw, lang: raw.lang === 'hi' ? 'hi' : 'en', place: validPlace(raw.place) ?? EMPTY.place, placeChosen: !!raw.placeChosen && !!validPlace(raw.place) }
  } catch {
    /* corrupted entry: start fresh */
  }
  // Older builds kept the language here.
  try {
    if (!state.lang || state.lang === 'en') if (localStorage.getItem('news-lang') === 'hi') state = { ...state, lang: 'hi' }
  } catch {
    /* ignore */
  }
}
loadLibrary()

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

export const library = {
  get: () => state,
  toggleSaved: (id: string) => set({ ...state, saved: toggle(state.saved, id) }),
  toggleLiked: (id: string) => set({ ...state, liked: toggle(state.liked, id) }),
  toggleFollow: (key: string) => set({ ...state, follow: toggle(state.follow, key) }),
  setFollow: (keys: string[]) => set({ ...state, follow: [...new Set(keys)] }),
  setLang: (lang: Language) => {
    try {
      localStorage.setItem('news-lang', lang)
    } catch {
      /* ignore */
    }
    set({ ...state, lang })
  },
  setPlace: (place: Place) => set({ ...state, place: validPlace(place) ?? state.place, placeChosen: true }),
  addHighlight: (h: Highlight) => set({ ...state, hl: state.hl.some((x) => x.id === h.id && x.t === h.t) ? state.hl : [h, ...state.hl].slice(0, 200) }),
  removeHighlight: (h: Highlight) => set({ ...state, hl: state.hl.filter((x) => !(x.id === h.id && x.t === h.t)) }),
  markSeen: () => set({ ...state, seenAt: Date.now() }, false),
  /** Replace local state with a merged copy from the server without echoing it back. */
  adopt: (next: Library) => set(next, false),
  /** Called by the session provider to push changes to the API while signed in. */
  onChange: (fn: ((s: Library) => void) | null) => {
    onChange = fn
  },
}

export function mergeLibraries(a: Library, b: Partial<Library>): Library {
  const union = (x: string[], y: string[] = []) => [...new Set([...x, ...y])]
  return {
    ...a,
    saved: union(a.saved, b.saved),
    liked: union(a.liked, b.liked),
    follow: union(a.follow, b.follow),
    hl: [...a.hl, ...(b.hl ?? []).filter((h) => !a.hl.some((x) => x.id === h.id && x.t === h.t))],
    lang: a.lang !== 'en' ? a.lang : b.lang === 'hi' ? 'hi' : 'en',
    // A place chosen on this device wins; otherwise take the one saved on the account.
    place: a.placeChosen ? a.place : validPlace(b.place) ?? a.place,
    placeChosen: a.placeChosen || (!!b.placeChosen && !!validPlace(b.place)),
  }
}

const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => void listeners.delete(cb)
}

/** Subscribe to the shelf. The server snapshot is empty so prerendered HTML never contains personal data. */
export function useLibrary(): Library {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY)
}

export const useLang = (): Language => useLibrary().lang
export const usePlace = (): Place => useLibrary().place
