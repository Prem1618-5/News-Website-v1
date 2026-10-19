/**
 * Cookie and tracking consent. Choices stay on this device and are recorded in the API's consent ledger.
 * Analytics events are sent only when the reader allowed analytics. Global Privacy Control switches optional tiers off.
 */
import { useSyncExternalStore } from 'react'
import { CONSENT_VERSION } from '@news/contracts'
import { API_BASE } from './api'
import { library } from './library'

export type Choices = { necessary: true; preferences: boolean; analytics: boolean; personalization: boolean; notifications: boolean }
type Saved = { version: string; choices: Choices; at: number }

const KEY = 'news-consent-v2'
const ID_KEY = 'kiosk-reader'
const isBrowser = typeof window !== 'undefined'
export const gpcSignal = () => isBrowser && !!(navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl

/** Random, device-local identifier used only to key consent records and consented analytics. */
export function readerId(): string {
  if (!isBrowser) return ''
  try {
    let id = localStorage.getItem(ID_KEY)
    if (!id) {
      id = crypto.randomUUID?.() ?? `reader-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem(ID_KEY, id)
    }
    return id
  } catch {
    return `reader-${Date.now().toString(36)}`
  }
}

function read(): Saved | null {
  if (!isBrowser) return null
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Saved | null
    return saved && saved.version === CONSENT_VERSION ? saved : null
  } catch {
    return null
  }
}

const normalise = (c: Partial<Choices>): Choices => ({
  necessary: true,
  preferences: c.preferences !== false,
  analytics: gpcSignal() ? false : c.analytics === true,
  personalization: gpcSignal() ? false : c.personalization === true,
  notifications: false,
})

let current = read()
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function saveConsent(choices: Partial<Choices>, source: 'banner' | 'preference_center' = 'banner'): Choices {
  const clean = normalise(choices)
  current = { version: CONSENT_VERSION, choices: clean, at: Date.now() }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    /* choice applies for this visit only */
  }
  const id = readerId()
  if (id.length >= 8) {
    void fetch(`${API_BASE}/consent`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject_id: id, version: CONSENT_VERSION, choices: clean, source, gpc: gpcSignal() }),
    }).catch(() => undefined)
  }
  if (!clean.analytics) queue = []
  emit()
  return clean
}

export const getChoices = (): Choices | null => current?.choices ?? null
let open = false
export const openConsent = () => {
  open = true
  emit()
}
export const closeConsent = () => {
  open = false
  emit()
}

/** [decided, modalOpen]. Server snapshot says "decided" so no banner is ever prerendered. */
export function useConsentState(): { decided: boolean; open: boolean; choices: Choices | null } {
  const snap = useSyncExternalStore(
    (cb) => (listeners.add(cb), () => void listeners.delete(cb)),
    () => `${current ? 1 : 0}${open ? 1 : 0}${current ? JSON.stringify(current.choices) : ''}`,
    () => '10',
  )
  return { decided: snap[0] === '1', open: snap[1] === '1', choices: current?.choices ?? null }
}

type EventIn = { name: string; story_id?: string; section?: string; referrer_kind?: string; language?: string }
let queue: EventIn[] = []
let timer: number | undefined

function flush() {
  window.clearTimeout(timer)
  const id = readerId()
  if (!queue.length || !current?.choices.analytics || !id) {
    queue = []
    return
  }
  const events = queue.splice(0, 50)
  void fetch(`${API_BASE}/events`, {
    method: 'POST',
    keepalive: true,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject_id: id, events }),
  }).catch(() => undefined)
}

/** Queue an analytics event. Does nothing unless the reader opted in to analytics. */
export function track(name: string, extra: Omit<EventIn, 'name'> = {}) {
  if (!isBrowser || !current?.choices.analytics) return
  const width = window.innerWidth
  queue.push({
    name,
    ...extra,
    language: library.get().lang,
    ...({ device: width < 768 ? 'mobile' : width < 1100 ? 'tablet' : 'desktop', viewport: String(Math.round(width / 10) * 10) } as object),
  })
  window.clearTimeout(timer)
  timer = window.setTimeout(flush, 2500)
}

if (isBrowser) window.addEventListener('pagehide', flush)
