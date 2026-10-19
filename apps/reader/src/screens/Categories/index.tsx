import { Seo, pageTitle } from '@/lib/head'
import { Layouts } from '@/lib/responsive'
import { breadcrumbLd } from '@/lib/seo'
import { SITE } from '@/site'
import CategoriesMobile from './Mobile'

/** Phones only; on larger screens the desk rail and footer already list every desk. */
export default function Categories() {
  return (
    <>
      <Seo
        title={pageTitle('All desks')}
        description="Browse every desk: world, politics, business, tech, sports, culture, science, health, safety, justice, education, environment and entertainment."
        path="/categories"
        jsonLd={[breadcrumbLd([[SITE.name, '/'], ['All desks', '/categories']])]}
      />
      <Layouts mobile={<CategoriesMobile />} redirect="/" />
    </>
  )
}
