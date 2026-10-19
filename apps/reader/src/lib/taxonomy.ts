import { SCOPES, SECTIONS, type ScopeInfo, type SectionInfo } from '@news/contracts'
import type { Language, ScopeKey, SectionKey } from './types'

export { SCOPES, SECTIONS }
export type { ScopeInfo, SectionInfo }

const byKey = new Map<string, SectionInfo>(SECTIONS.map((s) => [s.key, s]))
const scopeByKey = new Map<string, ScopeInfo>(SCOPES.map((s) => [s.key, s]))

export const isSection = (k: string | undefined): k is SectionKey => !!k && byKey.has(k)
export const section = (k: string): SectionInfo => byKey.get(k) ?? SECTIONS[0]
export const sectionName = (k: string, lang: Language = 'en') => (lang === 'hi' ? section(k).hi : section(k).en)
export const sectionAbout = (k: string, lang: Language = 'en') => (lang === 'hi' ? section(k).aboutHi : section(k).about)
export const scope = (k: ScopeKey): ScopeInfo => scopeByKey.get(k) ?? SCOPES[0]

/** Outline icon per desk, as SVG child markup in the design's 24px grid (stroke 1.8). */
export const SECTION_ICON: Record<SectionKey, string> = {
  world: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  politics: '<path d="M3 21h18M5 21V10M9 21V10M15 21V10M19 21V10M3 10l9-6 9 6"/>',
  business: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3"/>',
  tech: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4"/>',
  sports: '<path d="M8 4h8v6a4 4 0 01-8 0zM8 6H4v1a4 4 0 004 4M16 6h4v1a4 4 0 01-4 4M12 14v4M8 20h8"/>',
  culture: '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="11" r="1"/><circle cx="12" cy="8" r="1"/><circle cx="16" cy="11" r="1"/>',
  science: '<path d="M9 3h6M10 3v6l-5 10a1 1 0 001 1h12a1 1 0 001-1l-5-10V3"/>',
  health: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M12 8v8M8 12h8"/>',
  safety: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  justice: '<path d="M12 4v16M6 20h12M5 7h14M5 7l-3 7a3 3 0 006 0zM19 7l-3 7a3 3 0 006 0z"/>',
  education: '<path d="M3 9l9-5 9 5-9 5zM7 11.5V16c0 1.5 2.2 3 5 3s5-1.5 5-3v-4.5M21 9v6"/>',
  environment: '<path d="M5 19c0-8 5-14 15-14 0 9-5 15-13 15M5 19c2-5 5-8 9-10"/>',
  entertainment: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3z"/>',
}

/** Tile tints from the design (--t1..--t4), picked per story so photo-less cards still look finished. */
export const TINTS = ['var(--t1)', 'var(--t2)', 'var(--t3)', 'var(--t4)'] as const
export const tint = (seed: string) => {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return TINTS[h % TINTS.length]
}
