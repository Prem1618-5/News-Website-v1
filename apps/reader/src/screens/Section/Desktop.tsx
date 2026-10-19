import { Link } from 'react-router-dom'
import DeskRail from '@/components/shared/DeskRail'
import SiteFooter from '@/components/shared/SiteFooter'
import SiteHeader from '@/components/shared/SiteHeader'
import { TileCard } from '@/components/story/cards'
import { FollowToggle, ScopeChips } from '@/components/ui/controls'
import { SectionIcon } from '@/components/ui/icons'
import type { SectionKey } from '@/lib/types'
import { useSectionModel } from './model'

export default function SectionDesktop({ desk }: { desk: SectionKey }) {
  const m = useSectionModel(desk)
  const hi = m.lang === 'hi'
  return (
    <div className="pg" style={{ minHeight: '100%' }}>
      <SiteHeader active="today" />
      <div className="with-rail" style={{ maxWidth: '1320px', margin: 'auto', padding: '24px 40px 80px', display: 'grid', gridTemplateColumns: '88px minmax(0,1fr)', gap: '24px' }}>
        <DeskRail active={desk} />
        <main id="main" style={{ display: 'grid', gap: '24px', alignContent: 'start', minWidth: '0' }}>
          <section className="card">
            <div className="row" style={{ padding: '24px', gap: '16px' }}>
              <span style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'var(--soft)', color: 'var(--pt)', display: 'grid', placeItems: 'center', flex: 'none' }}>
                <SectionIcon k={desk} size={28} />
              </span>
              <div style={{ flex: '1' }}>
                <h1 style={{ margin: '0', font: '700 30px/1.15 Inter', letterSpacing: '-.02em' }}>{m.name}</h1>
                <p className="mf" style={{ margin: '2px 0 0', fontSize: '15px' }}>{m.about}</p>
              </div>
              <FollowToggle followKey={desk} label={`Follow ${m.name}`} />
            </div>
            <div className="row" style={{ padding: '14px 24px', borderTop: '1px solid var(--bd)' }}>
              <ScopeChips name="scope-d" value={m.scope} onChange={m.setScope} lang={m.lang} />
            </div>
          </section>
          <section className="card">
            <div className="ch">
              <h2>{hi ? `${m.name} में ताज़ा` : `Latest in ${m.name}`}</h2>
              <p>{hi ? `${m.total} ख़बरें` : `${m.total} ${m.total === 1 ? 'story' : 'stories'}`}</p>
            </div>
            <div className="tiles">{m.stories.map((s) => <div key={s.id}><TileCard story={s} /></div>)}</div>
            {m.stories.length === 0 ? (
              <div style={{ padding: '8px 24px 32px' }}>
                <p className="mf" style={{ margin: '0 0 14px', maxWidth: '52ch' }}>
                  {hi ? 'इस डेस्क पर अभी कोई ख़बर नहीं है। जैसे ही हमारी टीम कुछ प्रकाशित करेगी, यहाँ दिखेगी।' : 'No stories here yet. They will appear as soon as the newsroom publishes them.'}
                </p>
                <Link to="/" className="btn p">{hi ? 'आज की ख़बरें देखें' : "Read today's news"}</Link>
              </div>
            ) : null}
          </section>
          {m.more ? (
            <div className="row mf sm" style={{ justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span>{hi ? `${m.total} में से ${m.stories.length} ख़बरें` : `${m.stories.length} of ${m.total} stories`}</span>
              <button type="button" className="btn" onClick={m.loadMore}>{hi ? 'और दिखाएँ' : 'Load more'}</button>
            </div>
          ) : null}
        </main>
      </div>
      <SiteFooter />
    </div>
  )
}
