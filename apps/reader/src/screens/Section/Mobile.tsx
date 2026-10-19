import { Link } from 'react-router-dom'
import MobileHeader from '@/components/shared/MobileHeader'
import SiteFooter from '@/components/shared/SiteFooter'
import TabBar from '@/components/shared/TabBar'
import { RowCard } from '@/components/story/cards'
import { DeskPills, FollowToggle, ScopeChips } from '@/components/ui/controls'
import { SectionIcon } from '@/components/ui/icons'
import type { SectionKey } from '@/lib/types'
import { useSectionModel } from './model'

export default function SectionMobile({ desk }: { desk: SectionKey }) {
  const m = useSectionModel(desk)
  const hi = m.lang === 'hi'
  return (
    <div className="pg m" style={{ position: 'relative', minHeight: '100dvh', overflowX: 'clip' }}>
      <MobileHeader />
      <DeskPills active={desk} lang={m.lang} />
      <div className="row" style={{ padding: '4px 16px 12px', gap: '14px' }}>
        <span style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--soft)', color: 'var(--pt)', display: 'grid', placeItems: 'center', flex: 'none' }}>
          <SectionIcon k={desk} size={24} />
        </span>
        <div style={{ flex: '1', minWidth: 0 }}>
          <h1 style={{ margin: '0', font: '700 26px/1.15 Inter' }}>{m.name}</h1>
          <div className="mf sm">{m.about}</div>
        </div>
        <FollowToggle followKey={desk} label={`Follow ${m.name}`} />
      </div>
      <div style={{ padding: '0 16px 12px' }}>
        <ScopeChips name="scope-m" value={m.scope} onChange={m.setScope} lang={m.lang} />
      </div>
      <main id="main-m" style={{ margin: '0 16px 20px' }}>
        <section className="card">
          <div className="ch" style={{ padding: '18px 16px 14px' }}>
            <h2>{hi ? `${m.name} में ताज़ा` : `Latest in ${m.name}`}</h2>
            <p>{hi ? `${m.total} ख़बरें` : `${m.total} ${m.total === 1 ? 'story' : 'stories'}`}</p>
          </div>
          {m.stories.map((s) => <RowCard key={s.id} story={s} />)}
          {m.stories.length === 0 ? (
            <div style={{ padding: '4px 16px 24px', borderTop: '1px solid var(--bd)' }}>
              <p className="mf" style={{ margin: '16px 0 14px' }}>{hi ? 'इस डेस्क पर अभी कोई ख़बर नहीं है।' : 'No stories here yet. They will appear as soon as the newsroom publishes them.'}</p>
              <Link to="/" className="btn p">{hi ? 'आज की ख़बरें देखें' : "Read today's news"}</Link>
            </div>
          ) : null}
        </section>
      </main>
      {m.more ? (
        <div className="row mf sm" style={{ justifyContent: 'center', gap: '12px', flexWrap: 'wrap', margin: '0 16px 20px' }}>
          <span>{hi ? `${m.total} में से ${m.stories.length} ख़बरें` : `${m.stories.length} of ${m.total} stories`}</span>
          <button type="button" className="btn" onClick={m.loadMore}>{hi ? 'और दिखाएँ' : 'Load more'}</button>
        </div>
      ) : null}
      <SiteFooter gutter={16} />
      <TabBar active="categories" />
    </div>
  )
}
