import type { Metadata } from 'next'
import { LEGAL, LAST_UPDATED } from '@/lib/legal-info'

export const metadata: Metadata = { title: 'Legal Notice — Piedro Portal' }

// Legal Notice / Imprint (required in e.g. Germany under the DDG, and good
// practice elsewhere). Fill the placeholders in src/lib/legal-info.ts.
export default function LegalNoticePage() {
  return (
    <article className="max-w-3xl mx-auto px-6 py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-gold mb-2">Piedro Portal</p>
      <h1 className="text-2xl font-bold text-stone-900 mb-1">Legal Notice</h1>
      <p className="text-xs text-stone-400 mb-8">Last updated: {LAST_UPDATED}</p>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-8">
        <strong>Draft for review.</strong> Complete the placeholders in <code>src/lib/legal-info.ts</code> with
        Piedro's registration details before publication.
      </div>

      <dl className="text-sm text-stone-700 space-y-3">
        <Row label="Operator">{LEGAL.companyLegalName}</Row>
        <Row label="Address">{LEGAL.registeredAddress}, {LEGAL.country}</Row>
        <Row label="Email"><a className="text-gold" href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a></Row>
        <Row label="Phone">{LEGAL.phone}</Row>
        <Row label="Chamber of Commerce (KvK)">{LEGAL.chamberOfCommerce}</Row>
        <Row label="VAT / BTW">{LEGAL.vatNumber}</Row>
        <Row label="Data protection contact"><a className="text-gold" href={`mailto:${LEGAL.dpoEmail}`}>{LEGAL.dpoEmail}</a></Row>
        {LEGAL.iso13485Certified && <Row label="Quality management">ISO 13485 certified — {LEGAL.isoCertNumber}</Row>}
      </dl>

      <p className="text-xs text-stone-400 mt-8">
        Medical-device conformity marks (CE/UKCA) apply to the manufactured footwear and its documentation, not
        to this Portal.
      </p>
    </article>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-3 border-b border-stone-100 pb-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-stone-400">{label}</dt>
      <dd className="text-stone-700">{children}</dd>
    </div>
  )
}
