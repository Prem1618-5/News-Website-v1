import { Link } from 'react-router-dom'
import SiteFooter from '@/components/shared/SiteFooter'
import SiteHeader from '@/components/shared/SiteHeader'
import { Ico } from '@/components/ui/icons'
import { initials, isHindi, storyPath, timeAgo, titleOf } from '@/lib/format'
import type { Notice } from '@/lib/hooks'
import { sectionName } from '@/lib/taxonomy'
import { SectionIcon } from '@/components/ui/icons'
import { library } from '@/lib/library'
import type { Language } from '@/lib/types'
import { useNoticesModel } from './model'

const dot = { width: '10px', height: '10px', borderRadius: '50%', background: 'var(--pr)', flex: 'none', marginTop: '6px' } as const

export function NoticeItem({ n, lang }: { n: Notice; lang: Language }) {
  const s = n.story
  const href = storyPath(s, lang === 'hi' && s.has_hi ? 'hi' : 'en')
  const hiAttr = isHindi(s, lang) ? 'hi' : undefined
  const hi = lang === 'hi'
  const when = timeAgo(s.published_at, lang)
  const k = n.kind === 'writer' ? 'w' : n.kind === 'near' ? 'n' : 'd'
  if (n.kind === 'breaking')
    return (
      <Link to={href} className="lr it" data-k="b" style={{ alignItems: 'flex-start', padding: '16px 20px', borderLeft: '4px solid #DC2626', background: '#FEF2F2', color: '#09090B' }}>
        <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#FEE2E2', color: '#B91C1C', display: 'grid', placeItems: 'center', flex: 'none' }}><Ico name="warn" size={22} /></span>
        <span style={{ flex: '1', minWidth: '0' }}>
          <span className="row" style={{ gap: '8px', flexWrap: 'wrap' }}>
            <span className="bk"><i />BREAKING</span>
            <span style={{ color: '#52525B', fontSize: '13px' }}>{sectionName(s.section, lang)} · {when}</span>
          </span>
          <b className="ht" lang={hiAttr} style={{ display: 'block', fontSize: '16px', marginTop: '6px' }}>{titleOf(s, lang)}</b>
        </span>
      </Link>
    )
  return (
    <Link to={href} className={`lr it${n.unread ? ' unr' : ''}`} data-k={k} style={{ alignItems: 'flex-start', padding: '16px 20px' }}>
      {n.kind === 'writer' ? (
        <span style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--soft)', color: 'var(--pt)', display: 'inline-grid', placeItems: 'center', font: '600 14px Inter', flex: 'none' }}>{initials(s.author)}</span>
      ) : (
        <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--mu)', color: 'var(--mf)', display: 'grid', placeItems: 'center', flex: 'none' }}>
          {n.kind === 'near' ? <Ico name="pin" size={22} /> : <SectionIcon k={s.section} />}
        </span>
      )}
      <span style={{ flex: '1', minWidth: '0' }}>
        <span className="row" style={{ gap: '8px', flexWrap: 'wrap' }}>
          {n.unread ? <span className="nwt">{hi ? 'नई' : 'New'}</span> : null}
          <span>
            <b>{n.kind === 'writer' ? s.author : n.kind === 'near' ? (hi ? 'आपके पास · रांची' : 'Near you · Ranchi') : `${sectionName(s.section, lang)} ${hi ? 'डेस्क' : 'desk'}`}</b>
            {n.kind === 'writer' ? (hi ? ' ने लिखा' : ' published') : ''}
          </span>
        </span>
        <b className="ht" lang={hiAttr} style={{ display: 'block', fontSize: '15px', marginTop: '2px' }}>{titleOf(s, lang)}</b>
        <span className="mf sm">{when}</span>
      </span>
      {n.unread ? <i className="ud" style={dot} /> : null}
    </Link>
  )
}

export default function NotificationsDesktop() {
  const m = useNoticesModel()
  const hi = m.lang === 'hi'
  return (
    <div className="pg" style={{ minHeight: '100%' }}>
      <SiteHeader />
      <main id="main" className="nt" style={{ maxWidth: '760px', margin: '28px auto 80px', padding: '0 24px', display: 'grid', gap: '20px' }}>
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ margin: '0', font: '700 30px/1.15 Inter', letterSpacing: '-.02em' }}>{hi ? 'सूचनाएँ' : 'Notifications'}</h1>
            <p className="mf" style={{ margin: '2px 0 0' }}>{hi ? `${m.unread} अपठित` : `${m.unread} unread from the newsroom and the desks you follow`}</p>
          </div>
          <span className="row">
            <Link to="/account#privacy" className="btn"><Ico name="bell" />{hi ? 'सेटिंग्स' : 'Settings'}</Link>
            <label className="cp">
              <input type="checkbox" className="mk" aria-label="Mark all as read" onChange={() => library.markSeen()} />
              <span className="off btn">{hi ? 'सब पढ़ा हुआ करें' : 'Mark all as read'}</span>
              <span className="on btn" style={{ color: 'var(--pt)' }}><Ico name="check" />{hi ? 'सब पढ़ लिया' : 'All read'}</span>
            </label>
          </span>
        </div>
        <div className="row rc" style={{ flexWrap: 'wrap' }} role="radiogroup" aria-label="Filter">
          {(['All', 'Writers', 'Desks', 'Near you'] as const).map((f, i) => (
            <label key={f}>
              <input type="radio" name="nt-filter" defaultValue={f} defaultChecked={i === 0} />
              <span className="pill">{hi ? ['सभी', 'लेखक', 'डेस्क', 'आपके पास'][i] : f}</span>
            </label>
          ))}
        </div>
        {m.breaking.length ? (
          <div className="brkc">
            <section className="card">
              <div className="ch"><h2>{hi ? 'ताज़ा ख़बर' : 'Breaking'}</h2><p>{hi ? 'पढ़ने तक ऊपर रहती है' : 'Pinned until you read it'}</p></div>
              {m.breaking.map((n) => <NoticeItem key={n.id} n={n} lang={m.lang} />)}
            </section>
          </div>
        ) : null}
        <section className="card">
          <div className="ch"><h2>{hi ? 'हाल की ख़बरें' : 'Recent'}</h2><p /></div>
          {m.rest.map((n) => <NoticeItem key={n.id} n={n} lang={m.lang} />)}
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
