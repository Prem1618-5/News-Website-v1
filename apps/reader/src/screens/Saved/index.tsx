import { DataGate, SavedEmptyView } from '@/components/shared/States'
import { Seo, pageTitle } from '@/lib/head'
import { Layouts } from '@/lib/responsive'
import SavedDesktop from './Desktop'
import SavedMobile from './Mobile'
import { useSavedModel } from './model'

export default function Saved() {
  const m = useSavedModel()
  return (
    <>
      <Seo title={pageTitle('Saved')} description="Your reading list and highlights." path="/saved" noindex />
      {m.nothing ? (
        <SavedEmptyView />
      ) : (
        <DataGate loading={m.feed.loading} error={m.feed.error} retry={m.feed.retry} what="your saved stories">
          <Layouts desktop={<SavedDesktop />} mobile={<SavedMobile />} />
        </DataGate>
      )}
    </>
  )
}
