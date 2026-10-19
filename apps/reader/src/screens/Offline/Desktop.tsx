import { Link } from 'react-router-dom'
import SiteHeader from '@/components/shared/SiteHeader'

export default function OfflineDesktop({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="pg" style={{ minHeight: "100%" }}>
      <SiteHeader />
      <div style={{ maxWidth: "720px", margin: "48px auto" }}>
        <div className="card">
          <div style={{ display: "grid", justifyItems: "center", textAlign: "center", gap: "14px", padding: "56px 24px" }}>
            <span style={{ width: "96px", height: "96px", borderRadius: "50%", background: "var(--soft)", color: "var(--pt)", display: "grid", placeItems: "center" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12a10 10 0 0114 0M8.5 15.5a5 5 0 017 0M12 19h.01" />
              </svg>
            </span>
            <h1 style={{ margin: "8px 0 0", font: "700 26px/1.2 Inter", letterSpacing: "-.02em" }}>You are offline</h1>
            <p className="mf" style={{ margin: "0", fontSize: "16px", maxWidth: "42ch" }}>Check your connection. Saved stories are still available.</p>
            <div className="row" style={{ flexWrap: "wrap", justifyContent: "center", marginTop: "8px" }}>
              <button type="button" className="btn p" onClick={onRetry}>Try again</button>
              <Link to="/saved" className="btn">Open saved</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
