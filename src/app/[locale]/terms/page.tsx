import type { Metadata } from 'next'
import { LEGAL, LAST_UPDATED } from '@/lib/legal-info'
import { getLegalContacts } from '@/lib/legal-contacts'

export const metadata: Metadata = { title: 'Terms of Use — Piedro Portal' }

export default async function TermsPage() {
  const { email } = await getLegalContacts()
  return (
    <article className="max-w-3xl mx-auto px-6 py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-gold mb-2">Piedro Portal</p>
      <h1 className="text-2xl font-bold text-stone-900 mb-1">Terms of Use</h1>
      <p className="text-xs text-stone-400 mb-8">Last updated: {LAST_UPDATED}</p>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-8">
        <strong>Draft for review.</strong> English template — to be reviewed by legal counsel and translated
        (NL/FR/DE) before publication.
      </div>

      <Section title="1. Acceptance">
        <p>
          These terms govern access to and use of the Piedro Portal operated by {LEGAL.companyLegalName}
          ({LEGAL.tradeName}). By using the Portal you agree to these terms.
        </p>
      </Section>
      <Section title="2. Eligibility and accounts">
        <p>
          The Portal is for authorised professional users (orthopaedic clinics and their clinicians). You are
          responsible for the confidentiality of your credentials and for all activity under your account, and
          must notify us of any unauthorised use.
        </p>
      </Section>
      <Section title="3. Acceptable use">
        <ul className="list-disc pl-5 space-y-1">
          <li>Only enter patient data for which you have a lawful basis and the necessary authorisation.</li>
          <li>Do not attempt to access data of other companies or to circumvent access controls.</li>
          <li>Do not misuse, overload, reverse-engineer or disrupt the service.</li>
        </ul>
      </Section>
      <Section title="4. Orders">
        <p>
          Orders placed through the Portal are requests for custom-made orthopaedic footwear and are subject to
          {' '}{LEGAL.tradeName}&apos;s confirmation and applicable commercial agreement. You are responsible for the
          accuracy of the specifications and patient details you submit.
        </p>
      </Section>
      <Section title="5. Intellectual property">
        <p>
          The Portal, its content and the product catalogue are owned by {LEGAL.tradeName} or its licensors and
          may not be copied or reused without permission.
        </p>
      </Section>
      <Section title="6. Availability and changes">
        <p>
          We aim for high availability but do not guarantee uninterrupted access. We may update the Portal and
          these terms; material changes will be communicated.
        </p>
      </Section>
      <Section title="7. Liability">
        <p>
          <em>[Liability, warranty and indemnity clauses to be defined by legal counsel and aligned with the
          commercial contract and applicable law.]</em>
        </p>
      </Section>
      <Section title="8. Governing law">
        <p>
          These terms are governed by the laws of {LEGAL.country}, without prejudice to mandatory consumer or
          data-protection rules. <em>[Confirm jurisdiction with legal counsel.]</em>
        </p>
      </Section>
      <Section title="9. Contact">
        <p>
          {LEGAL.companyLegalName}, {LEGAL.registeredAddress} —{' '}
          <a className="text-gold" href={`mailto:${email}`}>{email}</a>.
        </p>
      </Section>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="text-base font-bold text-stone-900 mb-2">{title}</h2>
      <div className="text-sm text-stone-600 leading-relaxed space-y-2">{children}</div>
    </section>
  )
}
