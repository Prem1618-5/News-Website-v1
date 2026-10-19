import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '@/lib/library'

type Props = { active?: 'today' | 'categories' | 'saved' | 'account' }

const item = (on: boolean): CSSProperties => ({
  display: 'grid', justifyItems: 'center', alignContent: 'center', gap: '1px', minWidth: '56px', height: '52px',
  padding: '0 6px', borderRadius: '26px', font: '500 11px Inter',
  ...(on ? { background: 'var(--soft)', color: 'var(--pt)' } : { color: 'var(--mf)' }),
})

/** Floating mobile bottom navigation. */
export default function TabBar({ active }: Props) {
  const hi = useLang() === 'hi'
  return (
    <nav className="m-tabbar" aria-label="Primary" style={{ position: "fixed", left: "max(14px, env(safe-area-inset-left))", right: "max(14px, env(safe-area-inset-right))", bottom: "calc(18px + env(safe-area-inset-bottom))", height: "68px", borderRadius: "34px", background: "var(--glass)", backdropFilter: "blur(22px) saturate(1.7)", WebkitBackdropFilter: "blur(22px) saturate(1.7)", border: "1px solid var(--bd)", boxShadow: "0 14px 34px var(--sh),inset 0 1px 0 rgba(255,255,255,.35)", display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 8px", zIndex: "9" }}>
      <Link to="/" style={item(active === "today")}>

        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 11l9-8 9 8M5 10v10h14V10" />
        </svg>
        {hi ? 'आज' : 'Today'}
      </Link>
      <Link to="/categories" style={item(active === "categories")}>

        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
        {hi ? 'डेस्क' : 'Categories'}
      </Link>
      <Link to="/search" aria-label="Search" style={{ width: "52px", height: "52px", borderRadius: "26px", background: "var(--pr)", color: "#fff", display: "grid", placeItems: "center", boxShadow: "0 6px 16px rgba(37,99,235,.45)" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
      </Link>
      <Link to="/saved" style={item(active === "saved")}>

        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 3h12v18l-6-4-6 4z" />
        </svg>
        {hi ? 'सहेजी' : 'Saved'}
      </Link>
      <Link to="/account" style={item(active === "account")}>

        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c1-5 15-5 16 0" />
        </svg>
        {hi ? 'आप' : 'You'}
      </Link>
    </nav>
  )
}
