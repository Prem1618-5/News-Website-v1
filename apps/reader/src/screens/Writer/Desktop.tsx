import { useState } from 'react'
import SiteFooter from '@/components/shared/SiteFooter'
import SiteHeader from '@/components/shared/SiteHeader'
import { TileCard } from '@/components/story/cards'
import { DESK_BIO, DESK_BIO_HI, authorRole } from '@/components/story/writers'
import { FollowToggle } from '@/components/ui/controls'
import { Ico } from '@/components/ui/icons'
import { fmtDate, initials } from '@/lib/format'
import { section, sectionName } from '@/lib/taxonomy'
import { useWriterModel } from './model'

export default function WriterDesktop({ slug }: { slug: string }) {
  const m = useWriterModel(slug)
  const [desk, setDesk] = useState('all')
  const hi = m.lang === 'hi'
  const shown = desk === 'all' ? m.stories : m.stories.filter((s) => s.section === desk)
  return (
    <div className="pg" style={{ minHeight: '100%' }}>
      <SiteHeader />
      <div style={{ maxWidth: '1200px', margin: 'auto', padding: '28px 40px 80px', display: 'grid', gap: '24px' }}>
        <main id="main" style={{ display: 'grid', gap: '24px' }}>
          <section className="card" style={{ padding: '28px' }}>
            <div className="row" style={{ alignItems: 'flex-start', gap: '20px', flexWrap: 'nowrap' }}>
              <span style={{ width: '104px', height: '104px', borderRadius: '50%', background: 'var(--soft)', color: 'var(--pt)', display: 'inline-grid', placeItems: 'center', font: '600 34px Inter', flex: 'none' }}>{initials(m.name)}</span>
              <div style={{ flex: '1', minWidth: '0' }}>
                <h1 style={{ margin: '0', font: '700 30px/1.15 Inter', letterSpacing: '-.02em' }}>{m.name}</h1>
                <div className="mf">{authorRole(m.author, hi)}</div>
                {m.author.desk ? <p lang={hi ? 'hi' : undefined} style={{ margin: '12px 0', fontSize: '16px', maxWidth: '60ch' }}>{hi ? DESK_BIO_HI : DESK_BIO}</p> : <div style={{ height: 12 }} />}
                <div className="row mf" style={{ flexWrap: 'wrap', gap: '16px' }}>
                  <span className="row" style={{ gap: '4px' }}><Ico name="pin" size={16} />Ranchi</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--bd)', maxWidth: '560px' }}>
                  <div><b style={{ fontSize: '20px' }}>{m.total}</b><div className="mf sm">{hi ? 'ख़बरें' : 'Stories'}</div></div>
                  <div><b style={{ fontSize: '20px' }}>{m.desks.length}</b><div className="mf sm">{hi ? 'डेस्क' : 'Desks covered'}</div></div>
                  <div><b style={{ fontSize: '20px' }}>{fmtDate(m.stories[0]?.published_at, m.lang)}</b><div className="mf sm">{hi ? 'ताज़ा ख़बर' : 'Latest story'}</div></div>
                </div>
              </div>
              <FollowToggle followKey={`w:${slug}`} label={`Follow ${m.name}`} />
            </div>
          </section>
          <section className="card">
            <div className="ch">
              <h2>{hi ? 'ख़बरें' : 'Articles'}</h2>
              <p>{hi ? `${m.name} की ख़बरें` : `By ${m.name}`}</p>
            </div>
            {m.desks.length > 1 ? (
              <div className="row" style={{ flexWrap: 'wrap', gap: '12px', padding: '0 24px 16px' }}>
                <div className="row rc" style={{ flexWrap: 'wrap' }} role="radiogroup" aria-label="Desk">
                  {['all', ...m.desks].map((d) => (
                    <label key={d}>
                      <input type="radio" name="desk-d" value={d} checked={desk === d} onChange={() => setDesk(d)} />
                      <span className="pill">{d === 'all' ? (hi ? 'सभी' : 'All') : sectionName(section(d).key, m.lang)}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="tiles">{shown.map((s) => <div key={s.id}><TileCard story={s} /></div>)}</div>
          </section>
        </main>
      </div>
      <SiteFooter />
    </div>
  )
}
