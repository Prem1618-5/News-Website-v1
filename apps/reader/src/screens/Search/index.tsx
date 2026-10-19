import { DataGate } from '@/components/shared/States'
import { Seo, pageTitle } from '@/lib/head'
import { Layouts } from '@/lib/responsive'
import SearchDesktop from './Desktop'
import SearchMobile from './Mobile'
import { useSearchModel } from './model'

export default function Search() {
  const m = useSearchModel()
  return (
    <>
      <Seo title={pageTitle('Search')} description="Search news from Ranchi, Jharkhand, India and the world." path="/search" noindex />
      <DataGate loading={m.source.loading} error={m.source.error} retry={m.source.retry} what="search results">
        <Layouts desktop={<SearchDesktop m={m} />} mobile={<SearchMobile m={m} />} />
      </DataGate>
    </>
  )
}
