import { Link } from 'react-router-dom'
import { CONSENT_TIERS } from '@news/contracts'
import DocPage, { H2 } from '@/components/shared/DocPage'
import { openConsent } from '@/lib/consent'

export default function Privacy() {
  return (
    <DocPage
      path="/privacy"
      title="Privacy"
      description="What we store, why, and the choices you have. Reading the news needs no account."
    >
      <p>You can read every story without an account or any tracking. The choices below only apply if you want extra features.</p>
      <H2>What we store</H2>
      <ul style={{ margin: 0, paddingLeft: '1.2em', display: 'grid', gap: 8 }}>
        <li><b>On your device:</b> your saved stories, followed desks, highlights and language, so they are there next time. This stays on your device unless you sign in.</li>
        <li><b>If you create an account:</b> your email, display name, the same saved items and a reading-day count for your streak. You can download all of it from your <Link to="/account#privacy" style={{ color: 'var(--pt)' }}>account page</Link>.</li>
        <li><b>Your consent choices:</b> a record of what you allowed and when, tied to a random identifier rather than your name.</li>
        <li><b>Analytics, only if you allow it:</b> anonymous page views, device type and reading time, tied to a random identifier. No advertising and nothing is sold.</li>
      </ul>
      <H2>Your choices</H2>
      <div style={{ display: 'grid', gap: 10 }}>
        {CONSENT_TIERS.filter((t) => t.id !== 'notifications').map((t) => (
          <div key={t.id} className="card" style={{ padding: '14px 16px', font: '400 15px/1.5 Inter' }}>
            <b>{t.label}</b>{t.required ? ' (always on)' : ''}
            <div className="mf">{t.description}</div>
          </div>
        ))}
      </div>
      <p>
        <button type="button" className="btn p" onClick={openConsent}>Change cookie choices</button>
      </p>
      <p>If your browser sends a Global Privacy Control signal we keep optional tracking off.</p>
      <H2>Questions</H2>
      <p>Ask us anything on the <Link to="/contact" style={{ color: 'var(--pt)' }}>contact page</Link>.</p>
    </DocPage>
  )
}
