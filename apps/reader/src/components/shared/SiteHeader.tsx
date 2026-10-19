import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import RouterForm from '@/lib/RouterForm'
import { useLang } from '@/lib/library'
import { Ico } from '@/components/ui/icons'
import LangSwitch from './LangSwitch'
import { NoticeMenu } from './NoticeMenu'

type Props = { active?: 'today' | 'following' | 'saved'; menuOpen?: boolean }

const tab = (on: boolean): CSSProperties => ({
  padding: '0 14px', height: '44px', display: 'flex', alignItems: 'center', borderRadius: '10px',
  fontWeight: '500', ...(on ? { background: 'var(--mu)' } : { color: 'var(--mf)' }),
})

/** Desktop top bar. `active` highlights a nav tab; `menuOpen` shows the notification popover open. */
export default function SiteHeader({ active, menuOpen }: Props) {
  const hi = useLang() === 'hi'
  return (
    <header className="site-header" style={{ position: 'sticky', top: '0', zIndex: '5', background: 'var(--glass)', backdropFilter: 'blur(14px)', borderBottom: '1px solid var(--bd)' }}>
      <div className="row site-header-in" style={{ maxWidth: '1320px', margin: 'auto', padding: '0 40px', height: '68px', gap: '12px' }}>
        <Link to="/" className="row" style={{ font: '700 20px Inter', gap: '10px' }}>
          <span style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'var(--pr)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '17px' }}>N</span>
          <span className="site-name" translate="no">News APP</span>
        </Link>
        <nav className="row site-nav" aria-label="Primary" style={{ marginLeft: '16px', gap: '4px' }}>
          <Link to="/" style={tab(active === 'today')}>{hi ? 'आज' : 'Today'}</Link>
          <Link to="/following" style={tab(active === 'following')}>{hi ? 'फ़ॉलो' : 'Following'}</Link>
          <Link to="/saved" style={tab(active === 'saved')}>{hi ? 'सहेजे' : 'Saved'}</Link>
        </nav>
        <span style={{ flex: '1' }} />
        <RouterForm to="/search" role="search" className="row site-search" style={{ width: '300px', height: '44px', padding: '0 14px', border: '1px solid var(--bd)', borderRadius: '10px', background: 'var(--card)', color: 'var(--mf)' }}>
          <Ico name="search" />
          <input type="search" placeholder={hi ? 'ख़बरें खोजें' : 'Search news'} aria-label="Search news" style={{ border: '0', outline: '0', background: 'transparent', color: 'var(--fg)', font: '400 14px Inter', flex: '1', minWidth: '0' }} />
        </RouterForm>
        <LangSwitch />
        <NoticeMenu menuOpen={menuOpen} />
        <Link to="/account" className="ib" aria-label="Account" style={{ borderRadius: '22px' }}>
          <Ico name="user" />
        </Link>
      </div>
    </header>
  )
}
