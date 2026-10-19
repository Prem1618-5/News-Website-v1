import { useState } from 'react'
import { Link } from 'react-router-dom'
import MobileHeader from '@/components/shared/MobileHeader'
import SiteFooter from '@/components/shared/SiteFooter'
import TabBar from '@/components/shared/TabBar'
import { RowCard } from '@/components/story/cards'
import { DESK_BIO, DESK_BIO_HI, authorRole } from '@/components/story/writers'
import { FollowToggle } from '@/components/ui/controls'
import { Ico } from '@/components/ui/icons'
import { fmtDate, initials } from '@/lib/format'
import { sectionName } from '@/lib/taxonomy'
import { useWriterModel } from './model'

export default function WriterMobile({ slug }: { slug: string }) {
  const m = useWriterModel(slug)
  const [desk, setDesk] = useState('all')
  const hi = m.lang === 'hi'
  const shown = desk === 'all' ? m.stories : m.stories.filter((s) => s.section === desk)
  return (
    <div className="pg m" style={{ position: 'relative', minHeight: '100dvh', overflowX: 'clip' }}>
      <MobileHeader />
      <main id="main-m" style={{ padding: '16px' }}>
        <section className="card" style={{ padding: '20px' }}>
          <div className="row" style={{ justifyContent: 'space-between', gap: '12px' }}>
            <span style={{ width: '88px', height: '88px', borderRadius: '50%', background: 'var(--soft)', color: 'var(--pt)', display: 'inline-grid', placeItems: 'center', font: '600 29px Inter', flex: 'none' }}>{initials(m.name)}</span>
            <FollowToggle followKey={`w:${slug}`} label={`Follow ${m.name}`} />
          </div>
          <div style={{ marginTop: '16px' }}>
            <h1 style={{ margin: '0', font: '700 26px/1.15 Inter', letterSpacing: '-.02em' }}>{m.name}</h1>
            <div className="mf">{authorRole(m.author, hi)}</div>
          </div>
          {m.author.desk ? <p lang={hi ? 'hi' : undefined} style={{ margin: '12px 0 0', fontSize: '16px' }}>{hi ? DESK_BIO_HI : DESK_BIO}</p> : null}
          <div className="row mf" style={{ gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
            <span className="row" style={{ gap: '4px' }}><Ico name="pin" size={16} />Ranchi</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--bd)' }}>
            <div><b style={{ fontSize: '18px' }}>{m.total}</b><div className="mf sm">{hi ? 'ख़बरें' : 'Stories'}</div></div>
            <div><b style={{ fontSize: '18px' }}>{m.desks.length}</b><div className="mf sm">{hi ? 'डेस्क' : 'Desks'}</div></div>
            <div><b style={{ fontSize: '14px' }}>{fmtDate(m.stories[0]?.published_at, m.lang)}</b><div className="mf sm">{hi ? 'ताज़ा' : 'Latest'}</div></div>
          </div>
        </section>
        {m.desks.length > 1 ? (
          <div style={{ padding: '16px 0 0' }}>
            <div className="row rc" style={{ flexWrap: 'wrap' }} role="radiogroup" aria-label="Desk">
              {['all', ...m.desks].map((d) => (
                <label key={d}>
                  <input type="radio" name="desk-m" value={d} checked={desk === d} onChange={() => setDesk(d)} />
                  <span className="pill">{d === 'all' ? (hi ? 'सभी' : 'All') : sectionName(d, m.lang)}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}
        <section className="card" style={{ marginTop: '16px' }}>
          <div className="ch" style={{ padding: '18px 16px 14px' }}>
            <h2>{hi ? 'ख़बरें' : 'Articles'}</h2>
            <p>{hi ? `${m.name} की ख़बरें` : `By ${m.name}`}</p>
          </div>
          {shown.map((s) => <RowCard key={s.id} story={s} />)}
        </section>
        <p className="mf sm" style={{ margin: '16px 0 0' }}><Link to="/categories" style={{ color: 'var(--pt)' }}>{hi ? 'सभी डेस्क देखें' : 'Browse all desks'}</Link></p>
      </main>
      <SiteFooter gutter={16} />
      <TabBar active="today" />
    </div>
  )
}
