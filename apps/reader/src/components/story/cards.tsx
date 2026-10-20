import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { deckOf, fmtDate, initials, isHindi, readTime, storyPath, titleOf } from '@/lib/format'
import { useLang } from '@/lib/library'
import { section as sectionInfo, sectionName, tint } from '@/lib/taxonomy'
import type { Story } from '@/lib/types'
import { SectionIcon } from '@/components/ui/icons'
import { LikeToggle, SaveToggle } from '@/components/ui/controls'

const clamp = (lines: number): CSSProperties => ({ display: '-webkit-box', WebkitLineClamp: lines, WebkitBoxOrient: 'vertical', overflow: 'hidden' })

/** Everything a card needs to show one story in the reader's language. */
export function useStoryView(s: Story) {
  const lang = useLang()
  const hiPage = lang === 'hi' && s.has_hi
  return {
    lang,
    title: titleOf(s, lang),
    deck: deckOf(s, lang),
    hindi: isHindi(s, lang),
    href: storyPath(s, hiPage ? 'hi' : 'en'),
    date: fmtDate(s.published_at, lang),
    section: sectionName(s.section, lang),
    read: readTime(s.read_minutes, lang),
  }
}

/** Photo when the story has one of our own; otherwise a tinted tile carrying the desk's icon. */
export function Thumb({ story, style, icon = 28, loading = 'lazy', priority = false }: { story: Story; style?: CSSProperties; icon?: number; loading?: 'lazy' | 'eager'; priority?: boolean }) {
  const info = sectionInfo(story.section)
  const photo = story.image_url
  return (
    <div className="img" aria-hidden={photo ? undefined : true} style={{ background: tint(story.id), overflow: 'hidden', position: 'relative', display: 'grid', placeItems: 'center', color: info.color, ...style }}>
      <SectionIcon k={story.section} size={icon} style={{ opacity: 0.35 }} />
      {photo ? (
        <img
          src={photo}
          alt={story.caption || ''}
          loading={priority ? 'eager' : loading}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onError={(e) => { e.currentTarget.style.display = 'none' }}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : null}
    </div>
  )
}

export function Byline({ story }: { story: Story }) {
  const v = useStoryView(story)
  return (
    <div className="row mf sm">
      <span className="av">{initials(story.author)}</span>
      <span style={{ color: 'var(--fg)' }}>{story.author}</span>
      <span className="dot" />
      <span>{v.date}</span>
    </div>
  )
}

function Pills({ story, margin }: { story: Story; margin: string }) {
  const v = useStoryView(story)
  return (
    <div className="row" style={{ margin }}>
      <span className="pill">{v.section}</span>
      {v.lang === 'hi' && story.has_hi ? (
        <span className="pill" lang="hi" style={{ background: 'var(--soft)', borderColor: 'transparent', color: 'var(--pt)' }}>हिन्दी</span>
      ) : null}
      <span className="mf sm">{v.read}</span>
    </div>
  )
}

/** Grid card: tile, desk pill, headline, standfirst, byline. */
export function TileCard({ story, ratio = '16/10' }: { story: Story; ratio?: string }) {
  const v = useStoryView(story)
  return (
    <Link to={v.href} style={{ display: 'block' }}>
      <Thumb story={story} style={{ aspectRatio: ratio }} />
      <Pills story={story} margin="14px 0 8px" />
      <h3 className="ht" lang={v.hindi ? 'hi' : undefined} style={clamp(3)}>{v.title}</h3>
      {v.deck ? <p className="mf" lang={v.hindi ? 'hi' : undefined} style={{ margin: '6px 0 14px', ...clamp(3) }}>{v.deck}</p> : <div style={{ height: '14px' }} />}
      <Byline story={story} />
    </Link>
  )
}

/** List row with a 88px tile on the right. Used in lists on phones and in Saved / Search on desktop. */
export function RowCard({ story, action }: { story: Story; action?: ReactNode }) {
  const v = useStoryView(story)
  return (
    <div className="lr" style={{ alignItems: 'flex-start', padding: '16px', position: 'relative' }}>
      <Link to={v.href} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="row" style={{ marginBottom: '6px' }}>
            <span className="pill">{v.section}</span>
            <span className="mf sm">{v.read}</span>
          </span>
          <b className="ht" lang={v.hindi ? 'hi' : undefined} style={{ fontSize: '16px', marginBottom: '8px', ...clamp(3) }}>{v.title}</b>
          <Byline story={story} />
        </span>
        <Thumb story={story} icon={24} style={{ width: '88px', height: '88px', flex: 'none' }} />
      </Link>
      {action}
    </div>
  )
}

/** "Near you" row: small tile, place and desk, headline. */
export function NearRow({ story, place }: { story: Story; place: string }) {
  const v = useStoryView(story)
  return (
    <Link to={v.href} className="row" style={{ gap: '12px', padding: '10px 0', borderTop: '1px solid var(--bd)', alignItems: 'flex-start' }}>
      <Thumb story={story} icon={22} style={{ width: '64px', height: '64px', flex: 'none' }} />
      <span style={{ minWidth: 0 }}>
        <span className="mf sm row" style={{ gap: '4px' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 21s7-6 7-12a7 7 0 10-14 0c0 6 7 12 7 12z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
          {place} · {v.section} · {v.read}
        </span>
        <b className="ht" lang={v.hindi ? 'hi' : undefined} style={{ fontSize: '15px', display: 'block', ...clamp(3) }}>{v.title}</b>
      </span>
    </Link>
  )
}

/** Numbered headline row. */
export function NumRow({ story, n }: { story: Story; n: number }) {
  const v = useStoryView(story)
  return (
    <Link to={v.href} className="row" style={{ gap: '12px', padding: '10px 0', borderTop: '1px solid var(--bd)' }}>
      <span className="num">{n}</span>
      <b className="ht" lang={v.hindi ? 'hi' : undefined} style={{ fontSize: '15px', ...clamp(3) }}>{v.title}</b>
    </Link>
  )
}

/** Tinted desk tile (icon, "Tech desk", serif headline, standfirst). */
export function DeskTile({ story, background, big = true }: { story: Story; background: string; big?: boolean }) {
  const v = useStoryView(story)
  return (
    <section className="card hv" style={{ padding: big ? '20px' : '16px', background }}>
      <span style={{ color: 'var(--pt)' }}><SectionIcon k={story.section} size={big ? 28 : 24} /></span>
      {big ? <p className="mf sm" style={{ margin: '12px 0 4px' }}>{v.lang === 'hi' ? `${v.section} डेस्क` : `${v.section} desk`}</p> : null}
      <Link to={v.href}>
        <h3 className="ht ser" lang={v.hindi ? 'hi' : undefined} style={{ fontSize: big ? '22px' : '20px', lineHeight: big ? '1.25' : undefined, marginTop: big ? undefined : '8px', ...clamp(4) }}>{v.title}</h3>
      </Link>
      {big && v.deck ? <p className="mf" lang={v.hindi ? 'hi' : undefined} style={{ margin: '8px 0 0', ...clamp(4) }}>{v.deck}</p> : null}
    </section>
  )
}

/** Desktop lead story: large tile, serif headline, byline, like and save. */
export function HeroDesktop({ story, label }: { story: Story; label: string }) {
  const v = useStoryView(story)
  return (
    <section className="card hv" style={{ gridColumn: '1/8', gridRow: '1/3', display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px' }}>
      <Link to={v.href} style={{ display: 'block', flex: 1 }}>
        <Thumb story={story} icon={64} priority style={{ aspectRatio: '16/10', minHeight: '260px' }} />
        <div className="row" style={{ margin: '14px 0 8px' }}>
          <span className="pill">{v.section}</span>
          <span className="mf sm">{label} · {v.read}</span>
        </div>
        <h2 className="ht ser" lang={v.hindi ? 'hi' : undefined} style={{ fontSize: '32px', lineHeight: '1.15' }}>{v.title}</h2>
        {v.deck ? <p className="mf" lang={v.hindi ? 'hi' : undefined} style={{ margin: '8px 0 0', fontSize: '16px', ...clamp(3) }}>{v.deck}</p> : null}
      </Link>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Byline story={story} />
        <span className="row">
          <LikeToggle id={story.id} />
          <SaveToggle id={story.id} />
        </span>
      </div>
    </section>
  )
}

/** Phone lead story. */
export function HeroMobile({ story, label }: { story: Story; label: string }) {
  const v = useStoryView(story)
  return (
    <section className="card hv" style={{ gridColumn: '1/3', padding: '12px' }}>
      <Link to={v.href} style={{ display: 'block', padding: 0 }}>
        <Thumb story={story} icon={56} style={{ aspectRatio: '4/3', borderRadius: '14px' }} />
        <div className="row" style={{ margin: '14px 0 8px' }}>
          <span className="pill">{v.section}</span>
          <span className="mf sm">{label} · {v.read}</span>
        </div>
        <h1 className="ser" lang={v.hindi ? 'hi' : undefined} style={{ margin: '0 0 10px', font: '600 26px/1.18 Lora,Georgia,serif' }}>{v.title}</h1>
        <Byline story={story} />
      </Link>
    </section>
  )
}

/** Small two-up card used in the phone grid. */
export function CompactCard({ story }: { story: Story }) {
  const v = useStoryView(story)
  return (
    <Link to={v.href} className="card hv" style={{ display: 'block', padding: '12px' }}>
      <Thumb story={story} icon={32} style={{ aspectRatio: '4/3' }} />
      <b className="ht" lang={v.hindi ? 'hi' : undefined} style={{ fontSize: '15px', display: 'block', marginTop: '10px', ...clamp(4) }}>{v.title}</b>
      <span className="mf sm">{v.section} · {v.read}</span>
    </Link>
  )
}
