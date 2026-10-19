import { Link } from 'react-router-dom'
import DocPage, { H2 } from '@/components/shared/DocPage'
import { SECTIONS } from '@/lib/taxonomy'
import { SITE } from '@/site'

export default function About() {
  return (
    <DocPage
      kind="AboutPage"
      path="/about"
      title="About News APP"
      description="A bilingual news service for Ranchi and Jharkhand that explains the day clearly, names its sources and links to them."
    >
      <p>
        {SITE.name} reports the news that matters to people in Ranchi and across Jharkhand, together with the national and world stories that shape daily life.
        Everything is published in English and Hindi, so a family can read the same story in the language they are most comfortable with.
      </p>
      <H2>What we cover</H2>
      <p>
        We organise the news into {SECTIONS.length} simple desks:{' '}
        {SECTIONS.map((s, i) => (
          <span key={s.key}>
            <Link to={`/section/${s.key}`} style={{ color: 'var(--pt)' }}>{s.en}</Link>
            {i < SECTIONS.length - 1 ? ', ' : '.'}
          </span>
        ))}{' '}
        Each story is also tagged by where it happens: Ranchi, Jharkhand, India or the world, so you can read local news first.
      </p>
      <H2>How a story is made</H2>
      <p>
        Our desk follows published reports, confirms what they say, and writes the story again in plain language. Every story lists the reports it is based on, with links, so you can check the facts yourself.
        When a detail could not be confirmed we say so in the story instead of guessing.
      </p>
      <H2>Our promise to readers</H2>
      <p>
        Clear headlines, honest sourcing, quick corrections. Read the full list in our <Link to="/editorial-standards" style={{ color: 'var(--pt)' }}>editorial standards</Link>.
        If you spot a mistake, <Link to="/contact" style={{ color: 'var(--pt)' }}>tell us</Link>.
      </p>
      <H2>Reading on your terms</H2>
      <p>
        There are no pop-ups and no paywall. You can save stories, follow desks and writers, and highlight passages. Analytics are anonymous and only switched on if you allow them. See our <Link to="/privacy" style={{ color: 'var(--pt)' }}>privacy page</Link>.
      </p>
    </DocPage>
  )
}
