import { Link } from 'react-router-dom'
import DeskRail from '@/components/shared/DeskRail'
import SiteFooter from '@/components/shared/SiteFooter'
import SiteHeader from '@/components/shared/SiteHeader'
import { DeskTile, HeroDesktop, NearRow, NumRow, TileCard, Thumb, useStoryView } from '@/components/story/cards'
import { WriterRow } from '@/components/story/writers'
import { FollowToggle, PlaceChip, ScopeSwitch } from '@/components/ui/controls'
import { SectionIcon } from '@/components/ui/icons'
import { SECTIONS, sectionAbout, sectionName } from '@/lib/taxonomy'
import type { Story } from '@/lib/types'
import BreakingBanner from '@/components/shared/BreakingBanner'
import { useTodayModel } from './model'

function PictureCard({ story }: { story: Story }) {
  const v = useStoryView(story)
  return (
    <section className="card hv span-half" style={{ padding: '20px', gridColumn: '5/9' }}>
      <Link to={v.href} style={{ display: 'block' }}>
        <Thumb story={story} icon={40} style={{ aspectRatio: '16/10' }} />
        <div className="row" style={{ margin: '12px 0 6px' }}>
          <span className="pill">{v.section}</span>
          <span className="mf sm">{v.read}</span>
        </div>
        <h3 className="ht" lang={v.hindi ? 'hi' : undefined}>{v.title}</h3>
      </Link>
    </section>
  )
}

export default function TodayDesktop() {
  const m = useTodayModel()
  const hi = m.lang === 'hi'
  return (
    <div className="pg" style={{ minHeight: '100%' }}>
      <SiteHeader active="today" />
      <div className="with-rail" style={{ maxWidth: '1320px', margin: 'auto', padding: '24px 40px 80px', display: 'grid', gridTemplateColumns: '88px minmax(0,1fr)', gap: '24px' }}>
        <DeskRail />
        <main id="main" style={{ display: 'grid', gap: '24px', alignContent: 'start', minWidth: '0' }}>
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 style={{ margin: '0', font: '700 30px/1.15 Inter', letterSpacing: '-.02em' }}>{hi ? 'आज' : 'Today'}</h1>
              <p className="mf" style={{ margin: '2px 0 0' }} suppressHydrationWarning>{m.dateLabel}</p>
            </div>
            <div className="row" style={{ flexWrap: 'wrap', gap: '10px' }}>
              <PlaceChip />
              <ScopeSwitch name="scope-d" value={m.scope} onChange={m.setScope} lang={m.lang} />
            </div>
          </div>
          <BreakingBanner stories={m.breaking} lang={m.lang} />
          <div className="today-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: '16px' }}>
            {m.top ? <HeroDesktop story={m.top} label={hi ? 'मुख्य ख़बर' : 'Top story'} /> : null}
            {m.near.length ? (
              <section className="card hv" style={{ padding: '20px', gridColumn: '8/13' }}>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
                  <b style={{ fontSize: '16px' }}>{hi ? 'आपके पास' : 'Near you'}</b>
                  <span className="mf sm">{m.placeName}</span>
                </div>
                {m.near.map((s) => <NearRow key={s.id} story={s} place={m.placeName} />)}
              </section>
            ) : null}
            {m.latest.length ? (
              <section className="card hv" style={{ padding: '20px', gridColumn: '8/13' }}>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
                  <b style={{ fontSize: '16px' }}>{hi ? 'ताज़ा' : 'Latest'}</b>
                  <span className="mf sm">{hi ? 'आज' : 'Today'}</span>
                </div>
                {m.latest.map((s, i) => <NumRow key={s.id} story={s} n={i + 1} />)}
              </section>
            ) : null}
            {m.spotlight[0] ? <div className="span-half" style={{ gridColumn: '1/5', display: 'grid' }}><DeskTile story={m.spotlight[0]} background="var(--soft)" /></div> : null}
            {m.picture ? <PictureCard story={m.picture} /> : null}
            {m.writers.length > 1 ? (
              <section className="card hv" style={{ gridColumn: '9/13', padding: '20px 0 0' }}>
                <div style={{ padding: '0 20px' }}>
                  <div className="row" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
                    <b style={{ fontSize: '16px' }}>{hi ? 'लेखक फ़ॉलो करें' : 'Writers to follow'}</b>
                    <span className="mf sm" />
                  </div>
                </div>
                {m.writers.map((a) => <WriterRow key={a.slug} a={a} />)}
              </section>
            ) : (
              <section className="card hv" style={{ gridColumn: '9/13', padding: '20px 0 0' }}>
                <div style={{ padding: '0 20px' }}>
                  <div className="row" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
                    <b style={{ fontSize: '16px' }}>{hi ? 'डेस्क फ़ॉलो करें' : 'Desks to follow'}</b>
                    <Link to="/following" className="mf sm">{hi ? 'सभी' : 'See all'}</Link>
                  </div>
                </div>
                {SECTIONS.filter((s) => !m.followed.includes(s.key)).slice(0, 4).map((s) => (
                  <div key={s.key} className="row" style={{ gap: '12px', padding: '12px 20px', borderTop: '1px solid var(--bd)' }}>
                    <span className="mf"><SectionIcon k={s.key} /></span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ display: 'block' }}>{sectionName(s.key, m.lang)}</b>
                      <span className="mf sm">{sectionAbout(s.key, m.lang)}</span>
                    </span>
                    <FollowToggle followKey={s.key} label={`Follow ${s.en}`} />
                  </div>
                ))}
              </section>
            )}
            {m.forYou.length ? (
              <section className="card hv" style={{ padding: '20px', gridColumn: '1/9' }}>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
                  <b style={{ fontSize: '16px' }}>{m.personal ? (hi ? 'आपके लिए' : 'For you') : hi ? 'पढ़ते रहें' : 'Keep reading'}</b>
                  <span className="mf sm">{m.personal ? (hi ? 'आपके डेस्क से चुनी हुई' : 'Picked from your desks') : hi ? 'और ख़बरें' : 'More stories'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  {m.forYou.map((s) => <TileCard key={s.id} story={s} />)}
                </div>
              </section>
            ) : null}
            {m.spotlight[1] ? <div style={{ gridColumn: '9/13', display: 'grid' }}><DeskTile story={m.spotlight[1]} background="var(--t4)" /></div> : null}
          </div>
        </main>
      </div>
      <SiteFooter />
    </div>
  )
}
