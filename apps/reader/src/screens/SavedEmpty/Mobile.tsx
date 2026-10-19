import { Link } from 'react-router-dom'
import MobileHeader from '@/components/shared/MobileHeader'
import TabBar from '@/components/shared/TabBar'

export default function SavedEmptyMobile() {
  return (
    <div className="pg m" style={{ position: "relative", minHeight: "100dvh", overflowX: "clip" }}>
      <MobileHeader />
      <div style={{ display: "grid", justifyItems: "center", textAlign: "center", gap: "14px", padding: "56px 24px" }}>
        <span style={{ width: "96px", height: "96px", borderRadius: "50%", background: "var(--soft)", color: "var(--pt)", display: "grid", placeItems: "center" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 3h12v18l-6-4-6 4z" />
          </svg>
        </span>
        <h1 style={{ margin: "8px 0 0", font: "700 26px/1.2 Inter", letterSpacing: "-.02em" }}>Your reading list starts here</h1>
        <p className="mf" style={{ margin: "0", fontSize: "16px", maxWidth: "42ch" }}>Save a story to return to it whenever you have time.</p>
        <div className="row" style={{ flexWrap: "wrap", justifyContent: "center", marginTop: "8px" }}>
          <Link to="/" className="btn p">Browse Today</Link>
          <Link to="/writer" className="btn">Find writers</Link>
        </div>
      </div>
      <TabBar active="saved" />
    </div>
  )
}
