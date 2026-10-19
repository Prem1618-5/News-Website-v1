import { Link } from 'react-router-dom'
import { LoginForm } from '@/components/auth/forms'

export default function LoginDesktop() {
  return (
    <div className="pg" style={{ minHeight: "100%" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "900px" }}>
        <section style={{ background: "var(--mu)", padding: "56px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <Link to="/landing" className="row" style={{ font: "700 20px Inter", gap: "10px" }}>
            <span style={{ width: "32px", height: "32px", borderRadius: "9px", background: "var(--pr)", color: "#fff", display: "grid", placeItems: "center", fontSize: "17px" }}>N</span>
            News APP
          </Link>
          <div>
            <span className="pill">Your day, better informed</span>
            <h1 className="ser" style={{ margin: "20px 0", font: "600 46px/1.1 Lora", maxWidth: "14ch" }}>Stories worth your time. Context worth keeping.</h1>
            <p className="mf" style={{ fontSize: "18px", maxWidth: "40ch", margin: "0" }}>A thoughtful daily briefing, shaped around the things you care about.</p>
          </div>
          <span className="mf sm">World · Politics · Business · Tech · Culture</span>
        </section>
        <section style={{ display: "grid", placeItems: "center", padding: "48px" }}>
          <div style={{ width: "100%", maxWidth: "420px", display: "grid", gap: "20px" }}>
            <Link to="/landing" className="mf" style={{ display: "inline-flex", alignItems: "center", height: "44px" }}>← Back to News APP</Link>
            <div>
              <h2 style={{ margin: "0", font: "700 30px/1.15 Inter", letterSpacing: "-.02em" }}>Welcome back</h2>
              <p className="mf" style={{ margin: "6px 0 0", fontSize: "15px" }}>Pick up where your reading left off.</p>
            </div>
            <LoginForm />
            <p className="mf" style={{ margin: "0", textAlign: "center" }}>
              {"New to News APP? "}
              <Link to="/signup" style={{ color: "var(--pt)", fontWeight: "600" }}>Create an account</Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
