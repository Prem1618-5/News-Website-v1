import { useParams } from 'react-router-dom'
import { DataGate } from '@/components/shared/States'
import { useAuthor } from '@/lib/data'
import { Seo, pageTitle } from '@/lib/head'
import { Layouts } from '@/lib/responsive'
import { breadcrumbLd, isDesk, itemListLd } from '@/lib/seo'
import { SITE, abs } from '@/site'
import NotFound from '@/screens/NotFound'
import WriterDesktop from './Desktop'
import WriterMobile from './Mobile'
import { DESK_SLUG, useWriterModel } from './model'

function Profile({ slug }: { slug: string }) {
  const m = useWriterModel(slug)
  if (!m.feed.loading && !m.feed.error && m.stories.length === 0 && slug !== DESK_SLUG) return <NotFound />
  const path = `/writer/${slug}`
  return (
    <>
      <Seo
        title={pageTitle(`${m.name}: stories and reporting`)}
        description={`Read every story by ${m.name} on ${SITE.name}: news from Ranchi, Jharkhand, India and the world, in English and Hindi.`}
        path={path}
        noindex={m.stories.length === 0}
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'ProfilePage',
            url: abs(path),
            mainEntity: isDesk(m.name)
              ? { '@type': 'Organization', name: m.name, url: abs(path), parentOrganization: { '@type': 'NewsMediaOrganization', name: SITE.name, url: SITE.url } }
              : { '@type': 'Person', name: m.name, url: abs(path), worksFor: { '@type': 'NewsMediaOrganization', name: SITE.name, url: SITE.url } },
          },
          breadcrumbLd([[SITE.name, '/'], [m.name, path]]),
          ...(m.stories.length ? [itemListLd(m.stories)] : []),
        ]}
      />
      <DataGate loading={m.feed.loading} error={m.feed.error} retry={m.feed.retry} what="this profile">
        <Layouts desktop={<WriterDesktop slug={slug} />} mobile={<WriterMobile slug={slug} />} />
      </DataGate>
    </>
  )
}

/** /writer (the newsroom desk) and /writer/:slug. */
export default function Writer() {
  const { slug = DESK_SLUG } = useParams()
  useAuthor(slug) // start the request before the layouts mount
  return <Profile key={slug} slug={slug} />
}
