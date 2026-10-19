import DeskRail from '@/components/shared/DeskRail'
import SiteFooter from '@/components/shared/SiteFooter'
import SiteHeader from '@/components/shared/SiteHeader'
import { RowCard } from '@/components/story/cards'
import { SaveToggle } from '@/components/ui/controls'
import Highlights from './Highlights'
import { useSavedModel } from './model'

export default function SavedDesktop() {
  const m = useSavedModel()
  const hi = m.lang === 'hi'
  return (
    <div className="pg" style={{ minHeight: '100%' }}>
      <SiteHeader active="saved" />
      <div className="with-rail" style={{ maxWidth: '1320px', margin: 'auto', padding: '24px 40px 80px', display: 'grid', gridTemplateColumns: '88px minmax(0,1fr)', gap: '24px' }}>
        <DeskRail />
        <main id="main" style={{ display: 'grid', gap: '24px', alignContent: 'start', minWidth: '0' }}>
          <section className="card">
            <div className="row" style={{ padding: '24px', gap: '16px' }}>
              <div style={{ flex: '1' }}>
                <h1 style={{ margin: '0', font: '700 30px/1.15 Inter', letterSpacing: '-.02em' }}>{hi ? 'सहेजे गए' : 'Saved'}</h1>
                <p className="mf" style={{ margin: '2px 0 0', fontSize: '15px' }}>{hi ? 'वे ख़बरें और अंश जो आप रखना चाहते हैं' : 'Stories and highlights you want to keep'}</p>
              </div>
            </div>
          </section>
          <section className="card">
            <div className="ch">
              <h2>{hi ? 'पढ़ने की सूची' : 'Reading list'}</h2>
              <p>{hi ? `${m.stories.length} ख़बरें सहेजी गईं` : `${m.stories.length} ${m.stories.length === 1 ? 'story' : 'stories'} saved`}</p>
            </div>
            {m.stories.map((s) => (
              <RowCard key={s.id} story={s} action={<span style={{ marginLeft: 8 }}><SaveToggle id={s.id} /></span>} />
            ))}
          </section>
          <section className="card">
            <div className="ch">
              <h2>{hi ? 'हाइलाइट' : 'Highlights'}</h2>
              <p>{hi ? 'आपके चुने हुए अंश' : 'Passages you kept'}</p>
            </div>
            <Highlights items={m.hl} storyOf={m.storyOf} onRemove={m.removeHighlight} lang={m.lang} />
          </section>
        </main>
      </div>
      <SiteFooter />
    </div>
  )
}
