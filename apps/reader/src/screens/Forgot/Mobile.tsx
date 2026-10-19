import { Link } from 'react-router-dom'
import ResetYourPasswordDiv from '@/components/shared/ResetYourPasswordDiv'

export default function ForgotMobile() {
  return (
    <div className="pg m" style={{ position: "relative", minHeight: "100dvh", overflowX: "clip" }}>
      <div style={{ padding: "12px 16px" }}>
        <Link to="/login" className="ib" aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
      </div>
      <div style={{ padding: "8px 16px" }}>
        <ResetYourPasswordDiv />
      </div>
    </div>
  )
}
