import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { placeLabel } from '@news/contracts'
import { useMounted } from '@/lib/hooks'
import { library, useLibrary } from '@/lib/library'
import { track } from '@/lib/consent'
import { SCOPES, SECTIONS, sectionName } from '@/lib/taxonomy'
import type { Language, ScopeKey } from '@/lib/types'
import { Ico } from './icons'

/** Follow / Following button. `followKey` is a desk key ("health") or "w:<writer-slug>". */
export function FollowToggle({ followKey, label }: { followKey: string; label?: string }) {
  const { follow } = useLibrary()
  return (
    <label className="tgl">
      <input type="checkbox" aria-label={label ?? 'Follow'} checked={follow.includes(followKey)} onChange={() => library.toggleFollow(followKey)} />
      <span className="btn off p">Follow</span>
      <span className="btn on">
        <Ico name="check" size={16} />
        Following
      </span>
    </label>
  )
}

/** Heart and bookmark toggles. `icon` = square icon buttons on cards; `text` = labelled buttons on article pages. */
export function LikeToggle({ id, variant = 'icon', count }: { id: string; variant?: 'icon' | 'text'; count?: number }) {
  const { liked } = useLibrary()
  const heart = (fill: boolean) => (fill ? <span style={{ color: '#DC2626', display: 'inline-flex' }}><Ico name="heart" fill /></span> : <Ico name="heart" />)
  return (
    <label className="tgl">
      <input type="checkbox" aria-label="Like this story" checked={liked.includes(id)} onChange={() => library.toggleLiked(id)} />
      {variant === 'icon' ? (
        <>
          <span className="ib off">{heart(false)}</span>
          <span className="ib on">{heart(true)}</span>
        </>
      ) : (
        <>
          <span className="btn off">{heart(false)}{count ? `Like · ${count}` : 'Like'}</span>
          <span className="btn on">{heart(true)}{count ? `Liked · ${count + 1}` : 'Liked'}</span>
        </>
      )}
    </label>
  )
}

export function SaveToggle({ id, variant = 'icon' }: { id: string; variant?: 'icon' | 'text' }) {
  const { saved } = useLibrary()
  const onChange = () => {
    if (!saved.includes(id)) track('save', { story_id: id })
    library.toggleSaved(id)
  }
  return (
    <label className="tgl">
      <input type="checkbox" aria-label="Save this story" checked={saved.includes(id)} onChange={onChange} />
      {variant === 'icon' ? (
        <>
          <span className="ib off"><Ico name="bookmark" /></span>
          <span className="ib on"><Ico name="bookmark" fill /></span>
        </>
      ) : (
        <>
          <span className="btn off"><Ico name="bookmark" />Save</span>
          <span className="btn on"><Ico name="bookmark" fill />Saved</span>
        </>
      )}
    </label>
  )
}

/** Local / State / National / World switch. Controlled by the screen so it can filter its lists. */
export function ScopeSwitch({ value, onChange, name, lang = 'en' }: { value: ScopeKey; onChange: (k: ScopeKey) => void; name: string; lang?: Language }) {
  return (
    <div className="sg" role="radiogroup" aria-label="Coverage area">
      {SCOPES.map((s) => (
        <label key={s.key}>
          <input type="radio" name={name} value={s.key} checked={value === s.key} onChange={() => onChange(s.key)} />
          <span>{lang === 'hi' ? s.labelHi : s.label}</span>
        </label>
      ))}
    </div>
  )
}

/** All / Local / State / India / World pills that filter a list by coverage area. */
export function ScopeChips({ value, onChange, name, lang = 'en' }: { value: ScopeKey | 'all'; onChange: (k: ScopeKey | 'all') => void; name: string; lang?: Language }) {
  const items: { key: ScopeKey | 'all'; label: string }[] = [
    { key: 'all', label: lang === 'hi' ? 'सभी' : 'All' },
    ...SCOPES.map((s) => ({ key: s.key, label: lang === 'hi' ? s.labelHi : s.label })),
  ]
  return (
    <div className="row rc" style={{ flexWrap: 'wrap' }} role="radiogroup" aria-label="Coverage area">
      {items.map((it) => (
        <label key={it.key}>
          <input type="radio" name={name} value={it.key} checked={value === it.key} onChange={() => onChange(it.key)} />
          <span className="pill">{it.label}</span>
        </label>
      ))}
    </div>
  )
}

/** "Ranchi, Jharkhand": the reader's place, opening the location screen. */
export function PlaceChip({ style }: { style?: CSSProperties }) {
  const { place, lang } = useLibrary()
  const mounted = useMounted()
  return (
    <Link to="/location" className="btn" style={{ borderRadius: '22px', ...style }} aria-label={lang === 'hi' ? 'अपना क्षेत्र बदलें' : 'Change your area'}>
      <Ico name="pin" />
      <b style={{ fontWeight: 600 }} suppressHydrationWarning>{placeLabel(mounted ? place : undefined, lang) || placeLabel({ state: 'JH', district: 'ranchi' }, lang)}</b>
      <Ico name="chevron" size={14} />
    </Link>
  )
}

/** Scrollable desk pills on phones. */
export function DeskPills({ active, lang = 'en' }: { active?: string; lang?: Language }) {
  const on = { background: 'var(--pr)', borderColor: 'var(--pr)', color: 'var(--prf)' }
  const base = { height: '40px', padding: '0 16px', fontSize: '14px' }
  return (
    <nav aria-label="Desks" style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '12px 16px' }}>
      <Link to="/" className="pill" style={{ ...base, ...(active === undefined ? on : {}) }}>{lang === 'hi' ? 'आज' : 'Today'}</Link>
      {SECTIONS.map((s) => (
        <Link key={s.key} to={`/section/${s.key}`} className="pill" style={{ ...base, ...(active === s.key ? on : {}) }}>
          {sectionName(s.key, lang)}
        </Link>
      ))}
    </nav>
  )
}
