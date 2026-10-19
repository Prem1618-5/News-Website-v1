import { Link } from 'react-router-dom'

import { LandingDesks, LandingToday } from './blocks'

export default function LandingDesktop() {
  return (
    <div className="pg" style={{ minHeight: "100%" }}>
      <div style={{ borderBottom: "1px solid var(--bd)" }}>
        <header className="row" style={{ maxWidth: "1320px", margin: "auto", padding: "0 40px", height: "72px", gap: "12px" }}>
          <Link to="/landing" className="row" style={{ font: "700 20px Inter", gap: "10px" }}>
            <span style={{ width: "32px", height: "32px", borderRadius: "9px", background: "var(--pr)", color: "#fff", display: "grid", placeItems: "center", fontSize: "17px" }}>N</span>
            News APP
          </Link>
          <nav className="row" aria-label="Public" style={{ marginLeft: "24px", gap: "4px" }}>
            <a href="#today" style={{ padding: "0 14px", height: "44px", display: "flex", alignItems: "center", color: "var(--mf)", fontWeight: "500" }}>Today</a>
            <a href="#coverage" style={{ padding: "0 14px", height: "44px", display: "flex", alignItems: "center", color: "var(--mf)", fontWeight: "500" }}>Coverage</a>
            <a href="#approach" style={{ padding: "0 14px", height: "44px", display: "flex", alignItems: "center", color: "var(--mf)", fontWeight: "500" }}>Approach</a>
          </nav>
          <span style={{ flex: "1" }} />
          <Link to="/login" className="btn">Log in</Link>
          <Link to="/signup" className="btn p">Create account</Link>
        </header>
      </div>
      <div id="today" style={{ maxWidth: "1320px", margin: "auto", padding: "72px 40px 40px", display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "56px", alignItems: "center" }}>
        <div>
          <span className="pill">A better-informed day starts here</span>
          <h1 className="ser" style={{ margin: "20px 0", font: "600 64px/1.04 Lora,Georgia,serif", letterSpacing: "-.02em" }}>The day, in context.</h1>
          <p className="mf" style={{ fontSize: "19px", lineHeight: "1.55", maxWidth: "48ch", margin: "0 0 28px" }}>
            Reporting across the stories that shape your world, with the useful detail, clear perspective and time to read what matters.
          </p>
          <div className="row">
            <Link to="/signup" className="btn p">Make it yours</Link>
            <Link to="/login" className="btn">I have an account</Link>
          </div>
          <p className="mf sm" style={{ marginTop: "16px" }}>Independent perspective. Your pace. No noise.</p>
        </div>
        <LandingToday />
      </div>
      <div id="approach" style={{ maxWidth: "1320px", margin: "auto", padding: "24px 40px", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "24px" }}>
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
      <div id="coverage" style={{ maxWidth: "1320px", margin: "auto", padding: "24px 40px" }}>
        <LandingDesks />
      </div>
      <div style={{ maxWidth: "1320px", margin: "auto", padding: "24px 40px 56px" }}>
        <div className="card" style={{ padding: "48px", textAlign: "center" }}>
          <h2 className="ser" style={{ margin: "0 0 8px", font: "600 36px/1.15 Lora" }}>Know what happened. See what it means.</h2>
          <p className="mf" style={{ margin: "0 0 24px", fontSize: "16px" }}>Start with your interests and make Today your own.</p>
          <Link to="/signup" className="btn p">Create account</Link>
        </div>
      </div>
      <footer className="row mf sm" style={{ maxWidth: "1320px", margin: "auto", padding: "24px 40px 40px", borderTop: "1px solid var(--bd)", justifyContent: "space-between" }}>
        <span>Thoughtful reporting for every day.</span>
        <span>© News APP</span>
      </footer>
    </div>
  )
}
