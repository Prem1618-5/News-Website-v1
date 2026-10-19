import { Link } from 'react-router-dom'
import { Ico } from '@/components/ui/icons'
import LangSwitch from './LangSwitch'
import { NoticeMenu } from './NoticeMenu'

/** Mobile top bar (logo, search, language, notifications). `menuOpen` shows the notification popover open. */
export default function MobileHeader({ menuOpen }: { menuOpen?: boolean }) {
  return (
    <header className="row m-header" style={{ position: 'sticky', top: '0', zIndex: '5', height: '60px', padding: '0 12px 0 16px', background: 'var(--glass)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: '1px solid var(--bd)' }}>
      <Link to="/" className="row" style={{ font: '700 20px Inter', gap: '10px' }}>
        <span style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'var(--pr)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '17px' }}>N</span>
        <span className="site-name" translate="no">News APP</span>
      </Link>
      <span style={{ flex: '1' }} />
      <LangSwitch />
      <Link to="/search" className="ib" aria-label="Search">
        <Ico name="search" />
      </Link>
      <NoticeMenu menuOpen={menuOpen} />
    </header>
  )
}
