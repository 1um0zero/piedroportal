// Editable, per-locale text override keys (app_settings). Key = `${base}_${loc}`.
// Kept in a plain module (NOT the 'use server' action file, which may only export
// async functions).
export const TEXT_BASES = [
  'sp_title', 'sp_body',
  'reset_subject', 'reset_heading', 'reset_body', 'reset_cta',
] as const

export const TEXT_LOCALES = ['en', 'nl', 'fr', 'de'] as const
