import { Link } from 'react-router-dom'
import MobileHeader from '@/components/shared/MobileHeader'
import SiteFooter from '@/components/shared/SiteFooter'
import TabBar from '@/components/shared/TabBar'
import { Ico } from '@/components/ui/icons'
import { library } from '@/lib/library'
import { NoticeItem } from './Desktop'
import { useNoticesModel } from './model'

export default function NotificationsMobile() {
  const m = useNoticesModel()
  const hi = m.lang === 'hi'
  return (
    <div className="pg m" style={{ position: 'relative', minHeight: '100dvh', overflowX: 'clip' }}>
      <MobileHeader />
      <main id="main-m" className="nt" style={{ padding: '20px 16px 12px', display: 'grid', gap: '16px' }}>
        <div>
          <h1 style={{ margin: '0', font: '700 28px/1.15 Inter', letterSpacing: '-.02em' }}>{hi ? 'सूचनाएँ' : 'Notifications'}</h1>
          <p className="mf" style={{ margin: '4px 0 0' }}>{hi ? `${m.unread} अपठित` : `${m.unread} unread`}</p>
        </div>
        <span className="row" style={{ flexWrap: 'wrap' }}>
          <Link to="/account#privacy" className="btn"><Ico name="bell" />{hi ? 'सेटिंग्स' : 'Settings'}</Link>
          <label className="cp">
            <input type="checkbox" className="mk" aria-label="Mark all as read" onChange={() => library.markSeen()} />
            <span className="off btn">{hi ? 'सब पढ़ा हुआ करें' : 'Mark all as read'}</span>
            <span className="on btn" style={{ color: 'var(--pt)' }}><Ico name="check" />{hi ? 'सब पढ़ लिया' : 'All read'}</span>
          </label>
        </span>
        <div className="row rc" style={{ flexWrap: 'wrap' }} role="radiogroup" aria-label="Filter">
          {(['All', 'Writers', 'Desks', 'Near you'] as const).map((f, i) => (
            <label key={f}>
              <input type="radio" name="nt-filter-m" defaultValue={f} defaultChecked={i === 0} />
              <span className="pill">{hi ? ['सभी', 'लेखक', 'डेस्क', 'आपके पास'][i] : f}</span>
            </label>
          ))}
        </div>
        {m.breaking.length ? (
          <div className="brkc">
            <section className="card">
              <div className="ch" style={{ padding: '18px 16px 14px' }}><h2>{hi ? 'ताज़ा ख़बर' : 'Breaking'}</h2></div>
              {m.breaking.map((n) => <NoticeItem key={n.id} n={n} lang={m.lang} />)}
            </section>
          </div>
        ) : null}
        <section className="card">
          <div className="ch" style={{ padding: '18px 16px 14px' }}><h2>{hi ? 'हाल की ख़बरें' : 'Recent'}</h2></div>
          {m.rest.map((n) => <NoticeItem key={n.id} n={n} lang={m.lang} />)}
        </section>
      </main>
      <SiteFooter gutter={16} />
      <TabBar active="today" />
    </div>
  )
}
