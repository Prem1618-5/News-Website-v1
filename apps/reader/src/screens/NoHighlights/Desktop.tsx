import { Link } from 'react-router-dom'
import SiteHeader from '@/components/shared/SiteHeader'

export default function NoHighlightsDesktop() {
  return (
    <div className="pg" style={{ minHeight: "100%" }}>
      <SiteHeader />
      <div style={{ maxWidth: "720px", margin: "48px auto" }}>
        <div className="card">
          <div style={{ display: "grid", justifyItems: "center", textAlign: "center", gap: "14px", padding: "56px 24px" }}>
            <span style={{ width: "96px", height: "96px", borderRadius: "50%", background: "var(--soft)", color: "var(--pt)", display: "grid", placeItems: "center" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 8h4v4H8v4M15 8h4v4h-3v4" />
              </svg>
            </span>
            <h1 style={{ margin: "8px 0 0", font: "700 26px/1.2 Inter", letterSpacing: "-.02em" }}>No highlights yet</h1>
            <p className="mf" style={{ margin: "0", fontSize: "16px", maxWidth: "42ch" }}>Select a passage in any story to keep it here.</p>
            <div className="row" style={{ flexWrap: "wrap", justifyContent: "center", marginTop: "8px" }}>
              <Link to="/article" className="btn p">Read a story</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
