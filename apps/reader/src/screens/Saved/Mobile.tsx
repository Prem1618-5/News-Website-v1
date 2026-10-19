import MobileHeader from '@/components/shared/MobileHeader'
import SiteFooter from '@/components/shared/SiteFooter'
import TabBar from '@/components/shared/TabBar'
import { RowCard } from '@/components/story/cards'
import { SaveToggle } from '@/components/ui/controls'
import Highlights from './Highlights'
import { useSavedModel } from './model'

export default function SavedMobile() {
  const m = useSavedModel()
  const hi = m.lang === 'hi'
  return (
    <div className="pg m" style={{ position: 'relative', minHeight: '100dvh', overflowX: 'clip' }}>
      <MobileHeader />
      <main id="main-m">
        <div style={{ padding: '20px 16px 12px' }}>
          <h1 style={{ margin: '0', font: '700 28px/1.15 Inter', letterSpacing: '-.02em' }}>{hi ? 'सहेजे गए' : 'Saved'}</h1>
          <p className="mf" style={{ margin: '4px 0 0', fontSize: '15px' }}>{hi ? 'वे ख़बरें और अंश जो आप रखना चाहते हैं' : 'Stories and highlights you want to keep'}</p>
        </div>
        <div className="tb">
          <div style={{ padding: '0 16px 16px' }}>
            <div className="sg" role="radiogroup" aria-label="Saved view">
              <label>
                <input type="radio" name="saved-tab" defaultValue="Reading list" defaultChecked />
                <span>{hi ? 'पढ़ने की सूची' : 'Reading list'}</span>
              </label>
              <label>
                <input type="radio" name="saved-tab" defaultValue="Highlights" />
                <span>{hi ? 'हाइलाइट' : 'Highlights'}</span>
              </label>
            </div>
          </div>
          <div className="p1">
            <div style={{ margin: '0 16px 20px' }}>
              <section className="card">
                <div className="ch" style={{ padding: '18px 16px 14px' }}>
                  <h2>{hi ? 'पढ़ने की सूची' : 'Reading list'}</h2>
                  <p>{hi ? `${m.stories.length} ख़बरें सहेजी गईं` : `${m.stories.length} ${m.stories.length === 1 ? 'story' : 'stories'} saved`}</p>
                </div>
                {m.stories.map((s) => (
                  <RowCard key={s.id} story={s} action={<span style={{ marginLeft: 8 }}><SaveToggle id={s.id} /></span>} />
                ))}
              </section>
            </div>
          </div>
          <div className="p2">
            <div style={{ margin: '0 16px 20px' }}>
              <section className="card" style={{ paddingTop: 4 }}>
                <div className="ch" style={{ padding: '18px 16px 14px' }}>
                  <h2>{hi ? 'हाइलाइट' : 'Highlights'}</h2>
                  <p>{hi ? 'आपके चुने हुए अंश' : 'Passages you kept'}</p>
                </div>
                <Highlights items={m.hl} storyOf={m.storyOf} onRemove={m.removeHighlight} lang={m.lang} cols={1} />
              </section>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter gutter={16} />
      <TabBar active="saved" />
    </div>
  )
}
