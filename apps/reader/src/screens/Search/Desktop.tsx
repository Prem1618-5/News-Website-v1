import { Link } from 'react-router-dom'
import SiteFooter from '@/components/shared/SiteFooter'
import SiteHeader from '@/components/shared/SiteHeader'
import EmptyCard from '@/components/shared/EmptyCard'
import { RowCard } from '@/components/story/cards'
import { ScopeChips } from '@/components/ui/controls'
import { Ico } from '@/components/ui/icons'
import { SECTIONS, sectionName } from '@/lib/taxonomy'
import type { useSearchModel } from './model'

type Model = ReturnType<typeof useSearchModel>

export function DeskChips({ m, name }: { m: Model; name: string }) {
  const hi = m.lang === 'hi'
  return (
    <div className="row rc" style={{ flexWrap: 'wrap' }} role="radiogroup" aria-label="Desk">
      {(['all', ...SECTIONS.map((s) => s.key)] as const).map((k) => (
        <label key={k}>
          <input type="radio" name={name} value={k} checked={m.desk === k} onChange={() => m.setDesk(k)} />
          <span className="pill">{k === 'all' ? (hi ? 'सभी' : 'All') : sectionName(k, m.lang)}</span>
        </label>
      ))}
    </div>
  )
}

export default function SearchDesktop({ m }: { m: Model }) {
  const hi = m.lang === 'hi'
  return (
    <div className="pg" style={{ minHeight: '100%' }}>
      <SiteHeader />
      <div className="cols-aside" style={{ maxWidth: '1200px', margin: 'auto', padding: '28px 40px 80px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: '28px' }}>
        <main id="main" style={{ display: 'grid', gap: '20px', alignContent: 'start', minWidth: '0' }}>
          <h1 className="sr-only">{hi ? 'खोज' : 'Search'}</h1>
          <label className="row card" style={{ height: '60px', padding: '0 20px', color: 'var(--mf)', gap: '12px' }}>
            <Ico name="search" size={22} />
            <input type="search" value={m.text} onChange={(e) => m.setText(e.target.value)} placeholder={hi ? 'ख़बरें खोजें' : 'Search news'} aria-label="Search news" autoFocus style={{ border: '0', outline: '0', background: 'transparent', color: 'var(--fg)', font: '500 18px Inter', flex: '1' }} />
          </label>
          <ScopeChips name="scope-d" value={m.scope} onChange={m.setScope} lang={m.lang} />
          <DeskChips m={m} name="desk-d" />
          <p className="mf" style={{ margin: '0' }}>
            {m.searching ? (hi ? `“${m.q}” के लिए ${m.stories.length} नतीजे` : `${m.stories.length} ${m.stories.length === 1 ? 'result' : 'results'} for “${m.q}”`) : hi ? 'कुछ लिखें, या नीचे ताज़ा ख़बरें देखें।' : 'Type to search, or browse the latest below.'}
          </p>
          <section className="card">
            <div className="ch">
              <h2>{m.searching ? (hi ? 'नतीजे' : 'Results') : hi ? 'ताज़ा' : 'Latest'}</h2>
              <p>{m.searching ? (hi ? 'प्रासंगिकता के अनुसार' : 'Newest first') : hi ? 'आज की ख़बरें' : "Today's stories"}</p>
            </div>
            {m.stories.map((s) => <RowCard key={s.id} story={s} />)}
            {m.stories.length === 0 && (m.searching || m.desk !== 'all' || m.scope !== 'all') ? (
              <EmptyCard title={hi ? `“${m.q}” के लिए कुछ नहीं मिला` : m.q ? `No results for “${m.q}”` : 'Nothing matches these filters'} text={hi ? 'वर्तनी जाँचें, कोई बड़ा शब्द आज़माएँ, या डेस्क के हिसाब से ब्राउज़ करें।' : 'Check the spelling, try a broader term, or browse by desk.'}>
                <button type="button" className="btn p" onClick={() => (m.setText(''), m.setDesk('all'), m.setScope('all'))}>{hi ? 'खोज साफ़ करें' : 'Clear search'}</button>
              </EmptyCard>
            ) : null}
          </section>
        </main>
        <aside style={{ position: 'sticky', top: '84px', alignSelf: 'start' }}>
          <section className="card">
            <div className="ch">
              <h2>{hi ? 'विषय खोजें' : 'Explore topics'}</h2>
              <p>{hi ? 'किसी डेस्क पर जाएँ' : 'Jump to a desk'}</p>
            </div>
            <div className="row" style={{ flexWrap: 'wrap', padding: '0 20px 20px' }}>
              {SECTIONS.map((s) => (
                <Link key={s.key} to={`/section/${s.key}`} className="pill" style={{ height: '36px', padding: '0 14px', fontSize: '14px' }}>{sectionName(s.key, m.lang)}</Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
      <SiteFooter />
    </div>
  )
}
