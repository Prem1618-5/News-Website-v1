import { Link } from 'react-router-dom'
import { FollowToggle } from '@/components/ui/controls'
import { Ico } from '@/components/ui/icons'
import { initials } from '@/lib/format'
import { useLang } from '@/lib/library'
import type { Story } from '@/lib/types'
import { SITE } from '@/site'

export type Author = { name: string; slug: string; count: number; desk: boolean }

/** Distinct authors in a list of stories, busiest first. */
export function authorsOf(stories: Story[]): Author[] {
  const map = new Map<string, Author>()
  for (const s of stories) {
    if (!s.author) continue
    const a = map.get(s.author_slug) ?? { name: s.author, slug: s.author_slug, count: 0, desk: s.author === SITE.deskName }
    a.count += 1
    map.set(s.author_slug, a)
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
}

export const authorRole = (a: Author, hi: boolean) => (a.desk ? (hi ? 'न्यूज़रूम डेस्क' : 'Newsroom desk') : hi ? 'रिपोर्टर' : 'Reporter')

function Avatar({ name, size, font }: { name: string; size: number; font: string }) {
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', background: 'var(--soft)', color: 'var(--pt)', display: 'inline-grid', placeItems: 'center', font, flex: 'none' }}>
      {initials(name)}
    </span>
  )
}

/** Row in a "Writers to follow" list. */
export function WriterRow({ a }: { a: Author }) {
  const hi = useLang() === 'hi'
  return (
    <div className="row" style={{ gap: '12px', alignItems: 'flex-start', padding: '14px 20px', borderTop: '1px solid var(--bd)' }}>
      <Link to={`/writer/${a.slug}`} className="row" style={{ gap: '12px', flex: 1, alignItems: 'flex-start', minWidth: 0 }}>
        <Avatar name={a.name} size={44} font="600 14px Inter" />
        <span style={{ minWidth: 0 }}>
          <b style={{ display: 'block' }}>{a.name}</b>
          <span className="mf sm" style={{ display: 'block' }}>{authorRole(a, hi)}</span>
        </span>
      </Link>
      <FollowToggle followKey={`w:${a.slug}`} />
    </div>
  )
}

/** Card in the phone's horizontal "Writers to follow" strip. */
export function WriterCard({ a }: { a: Author }) {
  const hi = useLang() === 'hi'
  return (
    <div className="card" style={{ width: '220px', flex: 'none', padding: '16px', display: 'grid', gap: '8px', justifyItems: 'start' }}>
      <Avatar name={a.name} size={48} font="600 16px Inter" />
      <Link to={`/writer/${a.slug}`}><b>{a.name}</b></Link>
      <span className="mf sm">{authorRole(a, hi)}</span>
      <FollowToggle followKey={`w:${a.slug}`} />
    </div>
  )
}

export const DESK_BIO = 'The News APP newsroom. Every story names its sources and links to them so you can check the facts yourself.'
export const DESK_BIO_HI = 'न्यूज़ ऐप न्यूज़रूम। हर ख़बर अपने स्रोत बताती है और उनका लिंक देती है, ताकि आप तथ्य ख़ुद जाँच सकें।'

/** Author card shown under an article. */
export function AuthorCard({ a }: { a: Author }) {
  const hi = useLang() === 'hi'
  return (
    <div className="card" style={{ padding: '24px' }}>
      <div className="row" style={{ alignItems: 'flex-start', gap: '16px' }}>
        <Link to={`/writer/${a.slug}`} aria-label={`Open ${a.name}`}>
          <Avatar name={a.name} size={64} font="600 21px Inter" />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link to={`/writer/${a.slug}`}><b style={{ fontSize: '18px' }}>{a.name}</b></Link>
          <span className="mf" style={{ display: 'block' }}>{authorRole(a, hi)}</span>
        </div>
        <FollowToggle followKey={`w:${a.slug}`} />
      </div>
      {a.desk ? <p lang={hi ? 'hi' : undefined} style={{ margin: '14px 0 10px', fontSize: '15px' }}>{hi ? DESK_BIO_HI : DESK_BIO}</p> : null}
      <div className="row mf sm" style={{ flexWrap: 'wrap', gap: '16px', marginTop: a.desk ? 0 : 14 }}>
        <span className="row" style={{ gap: '4px' }}><Ico name="pin" size={14} />{SITE.city}</span>
      </div>
    </div>
  )
}
