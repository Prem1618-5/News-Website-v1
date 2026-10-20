import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { post } from '@/lib/api'
import { errorMessage, useSession } from '@/lib/session'
import { NEON_AUTH_URL } from '@/lib/neonToken'
import { Ico } from '@/components/ui/icons'

const INPUT = { height: '44px', border: '1px solid var(--bd)', borderRadius: '10px', padding: '0 14px', background: 'var(--bg)', color: 'var(--fg)', font: '400 15px Inter' } as const

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: '6px', fontWeight: 500 }}>
      {label}
      {children}
    </label>
  )
}

const Problem = ({ text }: { text: string }) => (
  <p role="alert" style={{ margin: 0, padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>{text}</p>
)

/** Email and password sign-in. Sends the reader home (or to where they were headed) on success. */
/** Second way in, shown only when Neon Auth is configured for this build. */
function NeonLink({ to }: { to: string }) {
  if (!NEON_AUTH_URL) return null
  return (
    <Link to={to} className="btn" style={{ width: '100%', textAlign: 'center' }}>
      Continue with Neon sign-in
    </Link>
  )
}

export function LoginForm({ next = '/' }: { next?: string }) {
  const { login } = useSession()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(email.trim(), password)
      navigate(next, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: '20px' }} noValidate>
      {error ? <Problem text={error} /> : null}
      <Field label="Email address">
        <input type="email" name="email" autoComplete="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} style={INPUT} />
      </Field>
      <Field label="Password">
        <input type="password" name="password" autoComplete="current-password" required placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} style={INPUT} />
      </Field>
      <Link to="/forgot-password" style={{ color: 'var(--pt)', fontWeight: 600, justifySelf: 'end', display: 'flex', alignItems: 'center', minHeight: '44px' }}>Forgot password?</Link>
      <button type="submit" className="btn p" disabled={busy || !email || !password} style={{ width: '100%' }}>{busy ? 'Signing in…' : 'Log in'}</button>
      <NeonLink to="/auth/sign-in" />
    </form>
  )
}

export function SignupForm() {
  const { signup } = useSession()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 8) return setError('Use at least 8 characters for your password.')
    setBusy(true)
    setError('')
    try {
      const { confirmationRequired } = await signup(name.trim(), email.trim(), password)
      if (confirmationRequired) setConfirm(true)
      else navigate('/onboarding', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    }
    setBusy(false)
  }
  if (confirm)
    return (
      <div style={{ display: 'grid', gap: 12, textAlign: 'center' }}>
        <h2 style={{ margin: 0, font: '700 24px Inter' }}>Check your inbox</h2>
        <p className="mf" style={{ margin: 0 }}>We sent a confirmation link to {email}. Open it, then log in.</p>
        <Link to="/login" className="btn p">Back to log in</Link>
      </div>
    )
  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: '20px' }} noValidate>
      {error ? <Problem text={error} /> : null}
      <Field label="Email address">
        <input type="email" name="email" autoComplete="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} style={INPUT} />
      </Field>
      <Field label="Password">
        <input type="password" name="password" autoComplete="new-password" required minLength={8} placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} style={INPUT} />
      </Field>
      <Field label="Display name">
        <input type="text" name="name" autoComplete="name" required minLength={2} placeholder="How should we address you?" value={name} onChange={(e) => setName(e.target.value)} style={INPUT} />
      </Field>
      <button type="submit" className="btn p" disabled={busy || !email || !password || name.trim().length < 2} style={{ width: '100%' }}>{busy ? 'Creating account…' : 'Create account'}</button>
      <NeonLink to="/auth/sign-up" />
    </form>
  )
}

/** Password-reset request. The API only sends mail when an account provider is configured. */
export function ForgotForm() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'unavailable'>('idle')
  const [error, setError] = useState('')
  const [devLink, setDevLink] = useState('')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setState('busy')
    setError('')
    try {
      const r = await post<{ sent: boolean; dev_link?: string }>('/auth/forgot', { email: email.trim() })
      setDevLink(r.dev_link ?? '')
      setState(r.sent ? 'sent' : 'unavailable')
    } catch (err) {
      setError(errorMessage(err))
      setState('idle')
    }
  }
  if (state === 'sent' || state === 'unavailable')
    return (
      <div style={{ textAlign: 'center' }}>
        <span className="fl" style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--soft)', color: 'var(--pt)', display: 'inline-grid', placeItems: 'center' }}>
          <Ico name={state === 'sent' ? 'check' : 'warn'} size={36} />
        </span>
        <h1 style={{ margin: '16px 0 8px', font: '700 26px Inter' }}>{state === 'sent' ? 'Check your inbox' : 'Reset by email is not available yet'}</h1>
        <p className="mf">
          {state === 'sent'
            ? 'If an account exists for that email, a reset link is on its way.'
            : 'Password reset emails are not switched on for this site yet. Please contact us and we will help you get back in.'}
        </p>
        {devLink ? <p className="mf sm"><a href={devLink} style={{ color: 'var(--pt)' }}>Open the reset link</a> (email is not set up on this development server)</p> : null}
        <Link to={state === 'sent' ? '/login' : '/contact'} className="btn p">{state === 'sent' ? 'Back to log in' : 'Contact us'}</Link>
      </div>
    )
  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: '18px' }}>
      <h1 style={{ margin: '0', font: '700 28px/1.15 Inter' }}>Reset your password</h1>
      <p className="mf" style={{ margin: '0' }}>Enter your email and we will send a reset link.</p>
      {error ? <Problem text={error} /> : null}
      <Field label="Email address">
        <input type="email" name="email" autoComplete="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} style={INPUT} />
      </Field>
      <button type="submit" className="btn p" disabled={state === 'busy' || !email}>{state === 'busy' ? 'Sending…' : 'Send reset link'}</button>
      <Link to="/login" className="mf" style={{ textAlign: 'center', padding: '12px' }}>Back to log in</Link>
    </form>
  )
}

/**
 * Choose a new password from the emailed link. Local accounts carry `?token=`; with Supabase the link signs
 * the reader in for recovery and puts `access_token` in the URL fragment instead.
 */
export function ResetForm() {
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
  const [error, setError] = useState('')
  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get('token')
    const hash = new URLSearchParams(window.location.hash.slice(1))
    setToken(query ?? (hash.get('type') === 'recovery' ? hash.get('access_token') ?? '' : ''))
  }, [])
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 8) return setError('Use at least 8 characters.')
    if (password !== confirm) return setError('The two passwords are different.')
    setState('busy')
    setError('')
    try {
      const r = await post<{ ok: boolean; authenticated?: boolean }>('/auth/reset', { token, password })
      setState('done')
      // A local account is signed in straight away; reload so the whole site sees the session.
      if (r.authenticated) window.setTimeout(() => window.location.assign('/'), 1200)
    } catch (err) {
      setError(errorMessage(err))
      setState('idle')
    }
  }
  if (state === 'done')
    return (
      <div style={{ textAlign: 'center' }}>
        <span className="fl" style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--soft)', color: 'var(--pt)', display: 'inline-grid', placeItems: 'center' }}>
          <Ico name="check" size={36} />
        </span>
        <h1 style={{ margin: '16px 0 8px', font: '700 26px Inter' }}>Password changed</h1>
        <p className="mf">You can use your new password now.</p>
        <Link to="/login" className="btn p">Log in</Link>
      </div>
    )
  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: '18px' }}>
      <h1 style={{ margin: '0', font: '700 28px/1.15 Inter' }}>Choose a new password</h1>
      {!token ? (
        <p className="mf" style={{ margin: 0 }}>
          This page needs the link from your reset email. <Link to="/forgot-password" style={{ color: 'var(--pt)' }}>Ask for a new link</Link>.
        </p>
      ) : (
        <>
          {error ? <Problem text={error} /> : null}
          <Field label="New password">
            <input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} style={INPUT} />
          </Field>
          <Field label="Type it again">
            <input type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} style={INPUT} />
          </Field>
          <button type="submit" className="btn p" disabled={state === 'busy'}>{state === 'busy' ? 'Saving…' : 'Save password'}</button>
        </>
      )}
    </form>
  )
}
