import { DataGate } from '@/components/shared/States'
import { useFeed } from '@/lib/data'
import { Seo } from '@/lib/head'
import { Layouts } from '@/lib/responsive'
import { itemListLd, organizationLd, websiteLd } from '@/lib/seo'
import { SITE } from '@/site'
import TodayDesktop from './Desktop'
import TodayMobile from './Mobile'

export default function Today() {
  const feed = useFeed()
  return (
    <>
      <Seo
        title={`${SITE.name}: ${SITE.tagline}`}
        description={SITE.description}
        path="/"
        alternates={[['en-IN', '/'], ['x-default', '/']]}
        jsonLd={[organizationLd(), websiteLd(), ...(feed.stories.length ? [itemListLd(feed.stories)] : [])]}
      />
      <DataGate loading={feed.loading} error={feed.error} retry={feed.retry} what="today's news">
        <Layouts desktop={<TodayDesktop />} mobile={<TodayMobile />} />
      </DataGate>
    </>
  )
}
