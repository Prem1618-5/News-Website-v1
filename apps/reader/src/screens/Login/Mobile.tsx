import { Link } from 'react-router-dom'
import { LoginForm } from '@/components/auth/forms'

export default function LoginMobile() {
  return (
    <div className="pg m" style={{ position: "relative", minHeight: "100dvh", overflowX: "clip" }}>
      <div style={{ padding: "12px 16px" }}>
        <Link to="/landing" className="ib" aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
      </div>
      <div style={{ padding: "8px 16px", display: "grid", gap: "18px" }}>
        <div>
          <h1 style={{ margin: "0", font: "700 30px/1.15 Inter", letterSpacing: "-.02em" }}>Welcome back</h1>
          <p className="mf" style={{ margin: "6px 0 0", fontSize: "15px" }}>Pick up where your reading left off.</p>
        </div>
        <LoginForm />
        <p className="mf" style={{ margin: "0", textAlign: "center" }}>
          {"New to News APP? "}
          <Link to="/signup" style={{ color: "var(--pt)", fontWeight: "600" }}>Create an account</Link>
        </p>
      </div>
    </div>
  )
}
