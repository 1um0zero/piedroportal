/**
 * CUSTOM beta — external evaluators allowlist.
 *
 * The CUSTOM (custom-made shoes) flow is a BETA gated to piedro_admin. For
 * evaluation rounds, named Piedro-side people may be allowlisted here to open
 * the form and the 3D preview with their existing account, WITHOUT gaining any
 * other back-office access. Evaluators run the form in evaluation mode: saving
 * and submitting are disabled client-side, and the server-side company guard in
 * insertCustomOrderAction blocks them anyway (fail-closed).
 *
 * Kept in git on purpose (Dome rule: nothing critical depends on a setting
 * outside git) — adding/removing an evaluator is a reviewed commit.
 */
const CUSTOM_BETA_EVALUATOR_EMAILS = new Set<string>([
  'mloonen@piedro.nl', // Martijn Loonen — Piedro, CUSTOM/OSB form feedback owner
])

export function isCustomBetaEvaluator(email: string | null | undefined): boolean {
  return !!email && CUSTOM_BETA_EVALUATOR_EMAILS.has(email.trim().toLowerCase())
}
