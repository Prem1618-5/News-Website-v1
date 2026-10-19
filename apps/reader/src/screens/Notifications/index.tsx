import { LoadingView, NoNotificationsView } from '@/components/shared/States'
import { Seo, pageTitle } from '@/lib/head'
import { Layouts } from '@/lib/responsive'
import NotificationsDesktop from './Desktop'
import NotificationsMobile from './Mobile'
import { useNoticesModel } from './model'

export default function Notifications() {
  const m = useNoticesModel()
  return (
    <>
      <Seo title={pageTitle('Notifications')} description="New stories from the newsroom and the desks you follow." path="/notifications" noindex />
      {!m.ready ? <LoadingView /> : m.none ? <NoNotificationsView /> : <Layouts desktop={<NotificationsDesktop />} mobile={<NotificationsMobile />} />}
    </>
  )
}
