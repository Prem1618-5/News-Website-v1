import { Link } from 'react-router-dom'
import { LandingDesks } from './blocks'

export default function LandingMobile() {
  return (
    <div className="pg m" style={{ position: "relative", minHeight: "100dvh", overflowX: "clip" }}>
      <header className="row" style={{ height: "64px", padding: "0 16px" }}>
        <Link to="/landing" className="row" style={{ font: "700 20px Inter", gap: "10px" }}>
          <span style={{ width: "32px", height: "32px", borderRadius: "9px", background: "var(--pr)", color: "#fff", display: "grid", placeItems: "center", fontSize: "17px" }}>N</span>
          News APP
        </Link>
        <span style={{ flex: "1" }} />
        <Link to="/login" className="btn">Log in</Link>
      </header>
      <div style={{ padding: "24px 16px" }}>
        <span className="pill">A better-informed day starts here</span>
        <h1 className="ser" style={{ margin: "16px 0", font: "600 44px/1.05 Lora", letterSpacing: "-.02em" }}>The day, in context.</h1>
        <p className="mf" style={{ fontSize: "17px", lineHeight: "1.55", margin: "0 0 24px" }}>
          Reporting across the stories that shape your world, with the detail, perspective and time to read what matters.
        </p>
        <div style={{ display: "grid", gap: "10px" }}>
          <Link to="/signup" className="btn p">Make it yours</Link>
          <Link to="/login" className="btn">I have an account</Link>
        </div>
      </div>
      <div style={{ padding: "0 16px", display: "grid", gap: "12px" }}>
        <div className="card" style={{ padding: "24px" }}>
          <span style={{ width: "48px", height: "48px", borderRadius: "12px", background: "var(--soft)", color: "var(--pt)", display: "grid", placeItems: "center" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 11l9-8 9 8M5 10v10h14V10" />
            </svg>
          </span>
          <h3 className="ht" style={{ margin: "16px 0 6px", fontSize: "20px" }}>Read calmly</h3>
          <p className="mf" style={{ margin: "0", fontSize: "15px" }}>A quiet front page, built for focus rather than noise.</p>
        </div>
        <div className="card" style={{ padding: "24px" }}>
          <span style={{ width: "48px", height: "48px", borderRadius: "12px", background: "var(--soft)", color: "var(--pt)", display: "grid", placeItems: "center" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 20s-8-5-8-11a4.5 4.5 0 018-2.5A4.5 4.5 0 0120 9c0 6-8 11-8 11z" />
            </svg>
          </span>
          <h3 className="ht" style={{ margin: "16px 0 6px", fontSize: "20px" }}>Follow what matters</h3>
          <p className="mf" style={{ margin: "0", fontSize: "15px" }}>Choose your desks and Today makes room for them.</p>
        </div>
        <div className="card" style={{ padding: "24px" }}>
          <span style={{ width: "48px", height: "48px", borderRadius: "12px", background: "var(--soft)", color: "var(--pt)", display: "grid", placeItems: "center" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 3h12v18l-6-4-6 4z" />
            </svg>
          </span>
          <h3 className="ht" style={{ margin: "16px 0 6px", fontSize: "20px" }}>Keep what is worth keeping</h3>
          <p className="mf" style={{ margin: "0", fontSize: "15px" }}>Save stories and highlight passages to return to.</p>
        </div>
      </div>
      <div style={{ padding: "20px 16px 0" }}>
        <LandingDesks mobile />
      </div>
      <footer className="mf sm" style={{ padding: "24px 16px" }}>Thoughtful reporting for every day. © News APP</footer>
    </div>
  )
}
