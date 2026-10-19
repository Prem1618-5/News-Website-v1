import { Link } from 'react-router-dom'
import { ResetForm } from '@/components/auth/forms'

export default function ResetDesktop() {
  return (
    <div className="pg" style={{ minHeight: '100%' }}>
      <div style={{ maxWidth: '440px', margin: '96px auto', padding: '0 24px' }}>
        <Link to="/" className="row" style={{ font: '700 20px Inter', gap: '10px' }}>
          <span style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'var(--pr)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '17px' }}>N</span>
          News APP
        </Link>
        <div style={{ height: '32px' }} />
        <ResetForm />
      </div>
    </div>
  )
}
