import { Link } from 'react-router-dom'

export default function FeedbackDesktop() {
  return (
    <div className="pg" style={{ position: "relative", minHeight: "100vh" }}>
      <div className="lay-split" style={{ padding: "48px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", alignContent: "start" }}>
        <h1 style={{ gridColumn: "1/3", margin: "0", font: "700 32px/1.1 Inter", letterSpacing: "-.02em" }}>Feedback and system states</h1>
        <div>
          <p className="mf sm" style={{ margin: "0 0 8px", fontWeight: "600", letterSpacing: ".06em", textTransform: "uppercase" }}>Toast · saved</p>
          <div className="row card" style={{ padding: "12px 16px", gap: "12px", boxShadow: "0 14px 30px var(--sh)", maxWidth: "460px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12l5 5 9-10" />
            </svg>
            <span style={{ flex: "1" }}>Story saved to your reading list</span>
            <Link to="/saved" style={{ color: "var(--pt)", fontWeight: "600", padding: "12px 4px" }}>Undo</Link>
            <button className="ib" aria-label="Dismiss" style={{ border: "0" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>
        <div>
          <p className="mf sm" style={{ margin: "0 0 8px", fontWeight: "600", letterSpacing: ".06em", textTransform: "uppercase" }}>Toast · error</p>
          <div className="row card" style={{ padding: "12px 16px", gap: "12px", boxShadow: "0 14px 30px var(--sh)", maxWidth: "460px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3l10 18H2zM12 10v4M12 17h.01" />
            </svg>
            <span style={{ flex: "1" }}>Could not save. Try again.</span>
            <button className="ib" aria-label="Dismiss" style={{ border: "0" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>
        <div>
          <p className="mf sm" style={{ margin: "0 0 8px", fontWeight: "600", letterSpacing: ".06em", textTransform: "uppercase" }}>Offline banner</p>
          <div className="row" style={{ padding: "12px 16px", background: "var(--mu)", borderRadius: "12px", gap: "12px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12a10 10 0 0114 0M8.5 15.5a5 5 0 017 0M12 19h.01" />
            </svg>
            <span style={{ flex: "1" }}>You are offline. Showing saved stories.</span>
            <button className="btn">Retry</button>
          </div>
        </div>
        <div>
          <p className="mf sm" style={{ margin: "0 0 8px", fontWeight: "600", letterSpacing: ".06em", textTransform: "uppercase" }}>Success banner</p>
          <div className="row" style={{ padding: "12px 16px", background: "var(--soft)", color: "var(--pt)", borderRadius: "12px", gap: "12px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12l5 5 9-10" />
            </svg>
            <span style={{ flex: "1", fontWeight: "500" }}>Your account details were updated.</span>
          </div>
        </div>
        <div>
          <p className="mf sm" style={{ margin: "0 0 8px", fontWeight: "600", letterSpacing: ".06em", textTransform: "uppercase" }}>Form error</p>
          <div style={{ display: "grid", gap: "12px", maxWidth: "420px" }}>
            <div className="row" style={{ padding: "12px 14px", border: "1px solid #DC2626", borderRadius: "12px", color: "#DC2626", gap: "10px" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3l10 18H2zM12 10v4M12 17h.01" />
              </svg>
              <span>That email and password do not match.</span>
            </div>
            <label style={{ display: "grid", gap: "6px", fontWeight: "500" }}>
              Email address
              <input type="email" placeholder="you@example.com" defaultValue="nisha@" style={{ height: "44px", border: "1px solid var(--bd)", borderRadius: "10px", padding: "0 14px", background: "var(--bg)", color: "var(--fg)", font: "400 15px Inter" }} />
            </label>
            <span style={{ color: "#DC2626", fontSize: "13px" }}>Enter a complete email address.</span>
          </div>
        </div>
        <div>
          <p className="mf sm" style={{ margin: "0 0 8px", fontWeight: "600", letterSpacing: ".06em", textTransform: "uppercase" }}>Confirm dialog</p>
          <div className="card" style={{ padding: "24px", maxWidth: "420px", boxShadow: "0 20px 50px var(--sh)" }}>
            <h2 style={{ margin: "0", font: "600 20px Inter" }}>Log out of News APP?</h2>
            <p className="mf" style={{ margin: "8px 0 20px" }}>Saved stories stay on your account.</p>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button className="btn">Cancel</button>
              <button className="btn" style={{ background: "#B91C1C", borderColor: "#B91C1C", color: "#fff" }}>Log out</button>
            </div>
          </div>
        </div>
        <div>
          <p className="mf sm" style={{ margin: "0 0 8px", fontWeight: "600", letterSpacing: ".06em", textTransform: "uppercase" }}>Cookie notice</p>
          <div className="card" style={{ padding: "20px", maxWidth: "560px" }}>
            <b>Your privacy, your way</b>
            <p className="mf" style={{ margin: "6px 0 16px" }}>Essential cookies keep you signed in. Choose whether we can personalise and measure.</p>
            <div className="row" style={{ flexWrap: "wrap" }}>
              <Link to="/account" className="btn">Customise</Link>
              <button className="btn">Essential only</button>
              <button className="btn p">Accept all</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
