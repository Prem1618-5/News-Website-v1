import { Navigate, useParams } from 'react-router-dom'
import { DataGate } from '@/components/shared/States'
import { useSection } from '@/lib/data'
import { Seo } from '@/lib/head'
import { Layouts } from '@/lib/responsive'
import { sectionHead } from '@/lib/seo'
import { isSection } from '@/lib/taxonomy'
import SectionDesktop from './Desktop'
import SectionMobile from './Mobile'

function Desk({ desk }: { desk: Parameters<typeof sectionHead>[0] }) {
  const feed = useSection(desk)
  const head = sectionHead(desk, feed.stories)
  return (
    <>
      {/* A desk with no stories is thin content: keep it out of search results until it has some. */}
      <Seo {...head} noindex={!feed.loading && !feed.error && feed.stories.length === 0} />
      <DataGate loading={feed.loading} error={feed.error} retry={feed.retry} what="this desk">
        <Layouts desktop={<SectionDesktop desk={desk} />} mobile={<SectionMobile desk={desk} />} />
      </DataGate>
    </>
  )
}

export default function Section() {
  const { desk } = useParams()
  if (!isSection(desk)) return <Navigate to="/404" replace />
  return <Desk key={desk} desk={desk} />
}
