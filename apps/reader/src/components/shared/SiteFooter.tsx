import { Link } from 'react-router-dom'
import { openConsent } from '@/lib/consent'
import { SECTIONS, sectionName } from '@/lib/taxonomy'
import { useLang } from '@/lib/library'
import { SITE } from '@/site'

/** Footer: crawlable links to every desk, the trust pages and the feeds. */
export default function SiteFooter({ gutter = 40 }: { gutter?: number }) {
  const hi = useLang() === 'hi'
  const link = { color: 'var(--mf)' }
  return (
    <footer className="site-footer" style={{ borderTop: '1px solid var(--bd)', marginTop: 8 }}>
      <div style={{ maxWidth: 1320, margin: 'auto', padding: `28px ${gutter}px 40px`, display: 'grid', gap: 16 }}>
        <nav aria-label="Desks" className="row" style={{ flexWrap: 'wrap', gap: '6px 16px' }}>
          {SECTIONS.map((s) => (
            <Link key={s.key} to={`/section/${s.key}`} className="sm" style={link}>{sectionName(s.key, hi ? 'hi' : 'en')}</Link>
          ))}
        </nav>
        <nav aria-label="About" className="row sm" style={{ flexWrap: 'wrap', gap: '6px 16px' }}>
          <Link to="/about" style={link}>{hi ? 'हमारे बारे में' : 'About'}</Link>
          <Link to="/editorial-standards" style={link}>{hi ? 'संपादकीय मानक' : 'Editorial standards'}</Link>
          <Link to="/contact" style={link}>{hi ? 'संपर्क' : 'Contact'}</Link>
          <Link to="/privacy" style={link}>{hi ? 'गोपनीयता' : 'Privacy'}</Link>
          <button type="button" onClick={openConsent} style={{ ...link, background: 'none', border: 0, padding: 0, font: 'inherit', cursor: 'pointer' }}>{hi ? 'कुकी विकल्प' : 'Cookie choices'}</button>
          <a href="/rss.xml" style={link}>RSS</a>
          <a href="/llms.txt" style={link}>llms.txt</a>
        </nav>
        <p className="mf sm" style={{ margin: 0 }}>© {SITE.name}. {hi ? 'रांची और झारखंड की ख़बरें, अंग्रेज़ी और हिंदी में।' : 'News from Ranchi and Jharkhand, in English and Hindi.'}</p>
      </div>
    </footer>
  )
}
