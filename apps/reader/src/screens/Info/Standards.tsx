import { Link } from 'react-router-dom'
import DocPage, { H2 } from '@/components/shared/DocPage'
import { SITE } from '@/site'

export default function Standards() {
  return (
    <DocPage
      path="/editorial-standards"
      title="Editorial standards"
      description="How we source, write, label and correct our stories."
    >
      <H2>Sourcing and attribution</H2>
      <ul style={{ margin: 0, paddingLeft: '1.2em', display: 'grid', gap: 8 }}>
        <li>Every story names the reports it is based on and links to them at the bottom of the page.</li>
        <li>We write in our own words. We do not copy another outlet&apos;s text or use its photographs without permission.</li>
        <li>We prefer primary sources: official statements, documents, the people involved.</li>
        <li>When a report is thin or a detail could not be confirmed, the story says so plainly.</li>
      </ul>
      <H2>Labelling</H2>
      <p>
        Stories show when they were published and, if changed, when they were updated. Stories written by our desk are credited to {SITE.deskName}. Stories by a named reporter carry that reporter&apos;s name and a profile page.
      </p>
      <H2>Languages</H2>
      <p>Stories are available in English and Hindi. Where both exist, each language has its own page and links to the other.</p>
      <H2 id="corrections">Corrections</H2>
      <p>
        If we get something wrong we fix it quickly, and where the change matters we add a note to the story saying what changed and when. To report an error, use our <Link to="/contact" style={{ color: 'var(--pt)' }}>contact page</Link> and include the link to the story.
      </p>
      <H2>Independence</H2>
      <p>Stories are not written to please advertisers, sources or anyone else. Opinion is labelled as opinion.</p>
    </DocPage>
  )
}
