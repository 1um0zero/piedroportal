import type { Metadata } from 'next'
import { LEGAL, LAST_UPDATED } from '@/lib/legal-info'

export const metadata: Metadata = { title: 'Privacy Policy — Piedro Portal' }

export default function PrivacyPage() {
  return (
    <article className="max-w-3xl mx-auto px-6 py-12 prose-stone">
      <p className="text-xs uppercase tracking-[0.2em] text-gold mb-2">Piedro Portal</p>
      <h1 className="text-2xl font-bold text-stone-900 mb-1">Privacy Policy</h1>
      <p className="text-xs text-stone-400 mb-8">Last updated: {LAST_UPDATED}</p>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-8">
        <strong>Draft for review.</strong> This notice is an English template. The bracketed
        placeholders and the controller/processor determination must be completed and approved by
        a Data Protection Officer / legal counsel, and translated (NL/FR/DE) before publication.
      </div>

      <Section title="1. Who we are">
        <p>
          {LEGAL.companyLegalName} ({LEGAL.tradeName}), {LEGAL.registeredAddress}, {LEGAL.country}, operates
          the Piedro Portal. For data-protection questions contact our privacy team at{' '}
          <a className="text-gold" href={`mailto:${LEGAL.dpoEmail}`}>{LEGAL.dpoEmail}</a>.
        </p>
      </Section>

      <Section title="2. Who this notice is for">
        <p>
          The Portal is used by orthopaedic clinics and their clinicians (&quot;users&quot;) to order custom-made
          footwear for their patients. This notice covers (a) the personal data of users, and (b) the
          patient data that clinicians enter when placing an order.
        </p>
      </Section>

      <Section title="3. What data we process">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Account data (users):</strong> name, email, gender (optional), profile photo, company, role.</li>
          <li><strong>Order &amp; patient data:</strong> patient name/reference, prescribing clinician, and the
            orthopaedic specification (construction, width, sizes per foot, and &quot;additions&quot; such as insoles,
            heel lifts and deformity corrections).</li>
          <li><strong>Technical data:</strong> authentication session cookies and standard server logs.</li>
        </ul>
        <p className="mt-2">
          Patient orthopaedic specifications are <strong>health data — a special category of personal data
          under Article 9 GDPR</strong>, and are afforded enhanced protection.
        </p>
      </Section>

      <Section title="4. Why and on what legal basis">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>To provide the ordering service</strong> and manufacture the device — performance of a
            contract / legitimate interests (Art. 6(1)(b)/(f)).</li>
          <li><strong>Health data (Art. 9):</strong> processed on the basis of, e.g., Art. 9(2)(h) (provision of
            health/social care and medical devices) and/or the patient&apos;s explicit consent obtained by the clinic.
            <em> [Confirm the applicable Art. 9 condition with legal counsel.]</em></li>
          <li><strong>Account security &amp; legal obligations</strong> (Art. 6(1)(c)).</li>
        </ul>
      </Section>

      <Section title="5. Controller and processor roles">
        <p>
          The clinic determines which patient data is entered and is responsible for the lawful basis and
          patient information at the point of care. {LEGAL.tradeName} processes that data to manufacture and
          deliver the device. <em>[The exact controller / joint-controller / processor allocation must be
          confirmed and reflected in a Data Processing Agreement between {LEGAL.tradeName} and each clinic.]</em>
        </p>
      </Section>

      <Section title="6. Cookies">
        <p>
          The Portal uses only <strong>essential cookies</strong> required to keep you signed in. No advertising
          or analytics cookies are used, so no consent banner is required; an informational notice is shown.
        </p>
      </Section>

      <Section title="7. Recipients and sub-processors" id="subprocessors">
        <p className="mb-3">We use the following service providers under data-processing agreements:</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-stone-400 border-b border-stone-200">
                <th className="py-2 pr-4">Provider</th><th className="py-2 pr-4">Purpose</th>
                <th className="py-2 pr-4">Location</th><th className="py-2">Safeguard</th>
              </tr>
            </thead>
            <tbody>
              {LEGAL.subProcessors.map((s) => (
                <tr key={s.name} className="border-b border-stone-100">
                  <td className="py-2 pr-4 font-medium text-stone-700">{s.name}</td>
                  <td className="py-2 pr-4 text-stone-600">{s.purpose}</td>
                  <td className="py-2 pr-4 text-stone-600">{s.location}</td>
                  <td className="py-2 text-stone-600">{s.dpa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="8. International transfers">
        <p>
          Some providers process data outside the EEA/UK (e.g. the United States). Such transfers rely on
          appropriate safeguards (EU Standard Contractual Clauses / UK Addendum and/or the EU–US Data Privacy
          Framework). <em>[Confirm each transfer mechanism and document it in the ROPA.]</em>
        </p>
      </Section>

      <Section title="9. Retention">
        <p>
          Documentation relating to custom-made medical devices is retained for at least{' '}
          {LEGAL.deviceRecordRetentionYears} years as required by medical-device regulation. Account data is
          retained while the account is active. Where the law requires retention, the right to erasure may be
          limited accordingly.
        </p>
      </Section>

      <Section title="10. Your rights">
        <p>
          Subject to legal limits, data subjects may request access, rectification, erasure, restriction,
          portability and may object to processing. Requests can be sent to{' '}
          <a className="text-gold" href={`mailto:${LEGAL.dpoEmail}`}>{LEGAL.dpoEmail}</a>. You may also lodge a
          complaint with a supervisory authority:
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          {LEGAL.supervisoryAuthorities.map((a) => (
            <li key={a.country}>{a.country}: {a.name} — <a className="text-gold" href={a.url}>{a.url}</a></li>
          ))}
        </ul>
      </Section>

      <Section title="11. Security">
        <p>
          We apply technical and organisational measures appropriate to health data, including encryption in
          transit and at rest, role-based access control, per-company data isolation and access logging.
        </p>
      </Section>
    </article>
  )
}

function Section({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-7 scroll-mt-24">
      <h2 className="text-base font-bold text-stone-900 mb-2">{title}</h2>
      <div className="text-sm text-stone-600 leading-relaxed space-y-2">{children}</div>
    </section>
  )
}
