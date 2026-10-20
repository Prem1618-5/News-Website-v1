import type { Language, Story } from './types'

const TZ = 'Asia/Kolkata'
const loc = (lang: Language) => (lang === 'hi' ? 'hi-IN' : 'en-IN')

/** "7 Oct 2026". Fixed time zone so the prerendered HTML and the browser always agree. */
export function fmtDate(iso: string | null | undefined, lang: Language = 'en'): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat(loc(lang), { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }).format(new Date(iso))
}

export function fmtLongDate(iso: string | Date, lang: Language = 'en'): string {
  return new Intl.DateTimeFormat(loc(lang), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ }).format(new Date(iso))
}

export function fmtDateTime(iso: string | null | undefined, lang: Language = 'en'): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat(loc(lang), { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: TZ }).format(new Date(iso))
}

/** Relative time. Only call from client-only UI: it depends on "now" and would differ in prerendered HTML. */
export function timeAgo(iso: string | null | undefined, lang: Language = 'en', now = Date.now()): string {
  if (!iso) return ''
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000))
  const hi = lang === 'hi'
  if (mins < 2) return hi ? 'अभी' : 'just now'
  if (mins < 60) return hi ? `${mins} मिनट पहले` : `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return hi ? `${hours} घंटे पहले` : `${hours} h ago`
  const days = Math.round(hours / 24)
  return days < 8 ? (hi ? `${days} दिन पहले` : `${days} d ago`) : fmtDate(iso, lang)
}

export const readTime = (min: number, lang: Language = 'en') => (lang === 'hi' ? `${min} मिनट` : `${min} min`)

export function initials(name: string): string {
  const parts = name.replace(/[^\p{L}\s]/gu, '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'N'
  return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Headline and standfirst in the reader's language, falling back to the story's own. */
export const titleOf = (s: Story, lang: Language) => (lang === 'hi' && s.title_hi ? s.title_hi : s.title)
export const deckOf = (s: Story, lang: Language) => (lang === 'hi' && s.title_hi ? s.deck_hi || s.deck : s.deck)
/** Caption in the reader's language, parsing bilingual pipe format "En | Hi". */
export function captionOf(s: Story, lang: Language): string {
  const cap = s.caption || ''
  if (!cap) return ''
  if (cap.includes('|')) {
    const parts = cap.split('|').map((p) => p.trim())
    if (parts.length >= 2) {
      return (lang === 'hi' ? parts[1] || parts[0] : parts[0] || parts[1]) ?? cap
    }
  }
  return cap
}
/** True when the text shown for this story is Hindi, so it gets lang="hi" and the Devanagari fonts. */
export const isHindi = (s: Story, lang: Language) => (lang === 'hi' && !!s.title_hi) || (s.language === 'hi' && !s.title_hi)

export const storyPath = (s: Pick<Story, 'slug' | 'id'>, lang: Language = 'en') =>
  `${lang === 'hi' ? '/hi' : ''}/story/${encodeURIComponent(s.slug || s.id)}`
