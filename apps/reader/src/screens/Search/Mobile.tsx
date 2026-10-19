import MobileHeader from '@/components/shared/MobileHeader'
import SiteFooter from '@/components/shared/SiteFooter'
import TabBar from '@/components/shared/TabBar'
import EmptyCard from '@/components/shared/EmptyCard'
import { RowCard } from '@/components/story/cards'
import { ScopeChips } from '@/components/ui/controls'
import { Ico } from '@/components/ui/icons'
import { DeskChips } from './Desktop'
import type { useSearchModel } from './model'

export default function SearchMobile({ m }: { m: ReturnType<typeof useSearchModel> }) {
  const hi = m.lang === 'hi'
  return (
    <div className="pg m" style={{ position: 'relative', minHeight: '100dvh', overflowX: 'clip' }}>
      <MobileHeader />
      <main id="main-m" style={{ padding: '16px', display: 'grid', gap: '14px' }}>
        <h1 className="sr-only">{hi ? 'खोज' : 'Search'}</h1>
        <label className="row card" style={{ height: '56px', padding: '0 16px', color: 'var(--mf)', gap: '12px' }}>
          <Ico name="search" size={20} />
          <input type="search" value={m.text} onChange={(e) => m.setText(e.target.value)} placeholder={hi ? 'ख़बरें खोजें' : 'Search news'} aria-label="Search news" style={{ border: '0', outline: '0', background: 'transparent', color: 'var(--fg)', font: '500 17px Inter', flex: '1', minWidth: 0 }} />
        </label>
        <ScopeChips name="scope-m" value={m.scope} onChange={m.setScope} lang={m.lang} />
        <DeskChips m={m} name="desk-m" />
        <p className="mf" style={{ margin: '0' }}>
          {m.searching ? (hi ? `“${m.q}” के लिए ${m.stories.length} नतीजे` : `${m.stories.length} ${m.stories.length === 1 ? 'result' : 'results'} for “${m.q}”`) : hi ? 'कुछ लिखें, या नीचे ताज़ा ख़बरें देखें।' : 'Type to search, or browse the latest below.'}
        </p>
        <section className="card">
          <div className="ch" style={{ padding: '18px 16px 14px' }}>
            <h2>{m.searching ? (hi ? 'नतीजे' : 'Results') : hi ? 'ताज़ा' : 'Latest'}</h2>
          </div>
          {m.stories.map((s) => <RowCard key={s.id} story={s} />)}
          {m.stories.length === 0 && (m.searching || m.desk !== 'all' || m.scope !== 'all') ? (
              <EmptyCard title={hi ? `“${m.q}” के लिए कुछ नहीं मिला` : m.q ? `No results for “${m.q}”` : 'Nothing matches these filters'} text={hi ? 'वर्तनी जाँचें, कोई बड़ा शब्द आज़माएँ, या डेस्क के हिसाब से ब्राउज़ करें।' : 'Check the spelling, try a broader term, or browse by desk.'}>
                <button type="button" className="btn p" onClick={() => (m.setText(''), m.setDesk('all'), m.setScope('all'))}>{hi ? 'खोज साफ़ करें' : 'Clear search'}</button>
              </EmptyCard>
            ) : null}
        </section>
      </main>
      <SiteFooter gutter={16} />
      <TabBar active="today" />
    </div>
  )
}
