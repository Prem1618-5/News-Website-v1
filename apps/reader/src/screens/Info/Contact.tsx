import { Link } from 'react-router-dom'
import DocPage, { H2 } from '@/components/shared/DocPage'
import { SITE } from '@/site'

export default function Contact() {
  return (
    <DocPage
      kind="ContactPage"
      path="/contact"
      title="Contact us"
      description="Tips, corrections, questions and feedback go to the newsroom."
    >
      {SITE.email ? (
        <p>
          Email the newsroom at <a href={`mailto:${SITE.email}`} style={{ color: 'var(--pt)' }}>{SITE.email}</a>. We read every message.
        </p>
      ) : (
        <p>Our contact details are being set up. Please check back soon.</p>
      )}
      <H2>Reporting a mistake</H2>
      <p>
        Send the link to the story and what is wrong. Corrections are explained in our <Link to="/editorial-standards#corrections" style={{ color: 'var(--pt)' }}>editorial standards</Link>.
      </p>
      <H2>News tips</H2>
      <p>If you know something Ranchi or Jharkhand should hear about, tell us what happened, where and when. Do not send passwords or private documents by email.</p>
      <H2>Account help</H2>
      <p>If you cannot sign in, include the email address on your account and we will help you get back in.</p>
    </DocPage>
  )
}
