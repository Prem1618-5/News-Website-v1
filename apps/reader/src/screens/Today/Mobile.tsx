import { Link } from 'react-router-dom'
import MobileHeader from '@/components/shared/MobileHeader'
import SiteFooter from '@/components/shared/SiteFooter'
import TabBar from '@/components/shared/TabBar'
import { CompactCard, DeskTile, HeroMobile, NearRow, RowCard } from '@/components/story/cards'
import { WriterCard } from '@/components/story/writers'
import { DeskPills, PlaceChip, ScopeSwitch } from '@/components/ui/controls'
import { scope as scopeInfo } from '@/lib/taxonomy'
import { useTodayModel } from './model'

export default function TodayMobile() {
  const m = useTodayModel()
  const hi = m.lang === 'hi'
  return (
    <div className="pg m" style={{ position: 'relative', minHeight: '100dvh', overflowX: 'clip' }}>
      <MobileHeader />
      <DeskPills lang={m.lang} />
      <div style={{ padding: '0 16px 12px', display: 'grid', gap: '10px' }}>
        <PlaceChip style={{ justifySelf: 'start' }} />
        <ScopeSwitch name="scope-m" value={m.scope} onChange={m.setScope} lang={m.lang} />
      </div>
      <main id="main-m" style={{ padding: '0 16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {m.top ? <HeroMobile story={m.top} label={hi ? 'मुख्य ख़बर' : 'Top story'} /> : null}
        {m.near.length ? (
          <section className="card hv" style={{ gridColumn: '1/3', padding: '16px' }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
              <b style={{ fontSize: '16px' }}>{hi ? 'आपके पास' : 'Near you'}</b>
              <span className="mf sm">{scopeInfo('ranchi')[hi ? 'placeHi' : 'place']}</span>
            </div>
            {m.near.slice(0, 2).map((s) => <NearRow key={s.id} story={s} place={scopeInfo('ranchi')[hi ? 'placeHi' : 'place']} />)}
          </section>
        ) : null}
        {m.latest.slice(0, 2).map((s) => <CompactCard key={s.id} story={s} />)}
        {m.spotlight[0] ? <div style={{ gridColumn: '1/3', display: 'grid' }}><DeskTile story={m.spotlight[0]} background="var(--soft)" big={false} /></div> : null}
      </main>
      {m.writers.length ? (
        <div style={{ padding: '0 0 20px' }}>
          <b style={{ margin: '0 16px 10px', display: 'block', fontSize: '16px' }}>{hi ? 'लेखक फ़ॉलो करें' : 'Writers to follow'}</b>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '0 16px' }}>
            {m.writers.map((a) => <WriterCard key={a.slug} a={a} />)}
          </div>
        </div>
      ) : null}
      {m.forYou.length ? (
        <div style={{ margin: '0 16px 20px' }}>
          <section className="card">
            <div className="ch" style={{ padding: '18px 16px 14px' }}>
              <h2>{hi ? 'आपके लिए' : 'For you'}</h2>
              <p>{hi ? 'आपके डेस्क से चुनी हुई' : 'Picked from your desks'}</p>
            </div>
            {m.forYou.map((s) => <RowCard key={s.id} story={s} />)}
          </section>
        </div>
      ) : null}
      <p className="mf sm" style={{ margin: '0 16px 12px' }}>
        <Link to="/categories" style={{ color: 'var(--pt)' }}>{hi ? 'सभी डेस्क देखें' : 'Browse all desks'}</Link>
      </p>
      <SiteFooter gutter={16} />
      <TabBar active="today" />
    </div>
  )
}
