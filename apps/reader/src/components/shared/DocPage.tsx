import type { ReactNode } from 'react'
import { Seo, pageTitle } from '@/lib/head'
import { breadcrumbLd } from '@/lib/seo'
import { useLayout } from '@/lib/useIsMobile'
import { SITE } from '@/site'
import MobileHeader from './MobileHeader'
import SiteFooter from './SiteFooter'
import SiteHeader from './SiteHeader'
import TabBar from './TabBar'

/** A long-form text page (About, standards, privacy) that works at every width. */
export default function DocPage({ title, description, path, kind = 'WebPage', children }: { title: string; description: string; path: string; kind?: 'WebPage' | 'AboutPage' | 'ContactPage'; children: ReactNode }) {
  const layout = useLayout()
  const desktop = layout !== 'mobile'
  const mobile = layout !== 'desktop'
  return (
    <>
      <Seo
        title={pageTitle(title)}
        description={description}
        path={path}
        jsonLd={[{ '@context': 'https://schema.org', '@type': kind, name: title, description, url: `${SITE.url}${path}`, isPartOf: { '@type': 'WebSite', name: SITE.name, url: SITE.url } }, breadcrumbLd([[SITE.name, '/'], [title, path]])]}
      />
      <div className="pg" style={{ minHeight: '100dvh' }}>
        {desktop ? <div className={layout === 'both' ? 'lay-d' : undefined}><SiteHeader /></div> : null}
        {mobile ? <div className={layout === 'both' ? 'lay-m m' : 'm'}><MobileHeader /></div> : null}
        <main id="main" className="doc" style={{ maxWidth: '760px', margin: '0 auto', padding: '32px 20px 56px' }}>
          <h1 style={{ margin: '0 0 8px', font: '700 34px/1.15 Inter', letterSpacing: '-.02em' }}>{title}</h1>
          <p className="mf" style={{ margin: '0 0 28px', fontSize: '17px' }}>{description}</p>
          <div style={{ display: 'grid', gap: '18px', font: '400 17px/1.7 Lora, Georgia, serif' }}>{children}</div>
        </main>
        <SiteFooter gutter={20} />
        {mobile ? <div className={layout === 'both' ? 'lay-m m' : 'm'}><TabBar /></div> : null}
      </div>
    </>
  )
}

export const H2 = ({ id, children }: { id?: string; children: ReactNode }) => (
  <h2 id={id} style={{ margin: '14px 0 0', font: '700 22px/1.3 Inter', letterSpacing: '-.01em', scrollMarginTop: 90 }}>{children}</h2>
)
