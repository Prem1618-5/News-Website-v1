import { DataGate, FollowingEmptyView } from '@/components/shared/States'
import { Seo, pageTitle } from '@/lib/head'
import { Layouts } from '@/lib/responsive'
import FollowingDesktop from './Desktop'
import FollowingMobile from './Mobile'
import { useFollowingModel } from './model'

export default function Following() {
  const m = useFollowingModel()
  return (
    <>
      <Seo title={pageTitle('Following')} description="Stories from the desks and writers you follow." path="/following" noindex />
      {m.none ? (
        <FollowingEmptyView />
      ) : (
        <DataGate loading={m.feed.loading} error={m.feed.error} retry={m.feed.retry} what="your desks">
          <Layouts desktop={<FollowingDesktop />} mobile={<FollowingMobile />} />
        </DataGate>
      )}
    </>
  )
}
