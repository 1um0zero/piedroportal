// ─────────────────────────────────────────────────────────────────────────────
// Central legal / company information used by the footer and the legal pages.
//
// ⚠️ CLIENT ACTION REQUIRED: replace every "[…]" placeholder with Piedro's real
// data, then have a DPO / legal counsel review the legal pages before go-live.
//
// Email addresses are NOT configured here — they live in the back-office
// (/admin/settings → contact_email, dpo_email) and are read via
// getLegalContacts() in src/lib/legal-contacts.ts. The strings below are only
// fallback placeholders shown until an admin sets them.
// ─────────────────────────────────────────────────────────────────────────────

export const LEGAL = {
  // Company / controller
  companyLegalName: '[Piedro International B.V. — confirm exact legal name]',
  tradeName: 'Piedro International',
  registeredAddress: '[Street, postal code, city, Netherlands]',
  country: 'Netherlands',
  chamberOfCommerce: '[KvK number]',          // NL Chamber of Commerce (KvK)
  vatNumber: '[BTW / VAT number]',
  email: '[contact@piedro.example]',     // fallback only — set in /admin/settings (contact_email)
  dpoEmail: '[privacy@piedro.example]',  // fallback only — set in /admin/settings (dpo_email)
  phone: '[+31 …]',

  // ISO / quality
  iso13485Certified: true,
  isoCertNumber: '[ISO 13485 certificate number — display per certification body rules]',

  // Supervisory authorities (data subjects may lodge complaints)
  supervisoryAuthorities: [
    { country: 'Netherlands', name: 'Autoriteit Persoonsgegevens (AP)', url: 'https://autoriteitpersoonsgegevens.nl' },
    { country: 'United Kingdom', name: "Information Commissioner's Office (ICO)", url: 'https://ico.org.uk' },
  ],

  // Sub-processors (Art. 28 / transparency). Keep in sync with signed DPAs.
  subProcessors: [
    { name: 'Vercel Inc.', purpose: 'Application hosting & CDN', location: 'EU / US', dpa: 'DPA + SCCs' },
    { name: 'Supabase', purpose: 'Database, authentication & file storage', location: '[confirm EU region]', dpa: 'DPA + SCCs' },
    { name: 'Resend', purpose: 'Transactional email (order notifications)', location: 'US', dpa: 'DPA + SCCs' },
    { name: 'Anthropic PBC', purpose: 'In-app AI assistant', location: 'US', dpa: 'DPA + zero-retention (to confirm)' },
  ],

  // Retention
  deviceRecordRetentionYears: 10, // MDR Annex XIII custom-made device documentation
} as const

export const LAST_UPDATED = '2026-06-04'
