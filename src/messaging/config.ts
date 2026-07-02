/**
 * Messaging Foundation — project configuration.
 *
 * This is the SINGLE file a new project edits to re-brand the whole messaging
 * stack (branded email wrapper, footer, AI-translation tone, locales, settings
 * keys). Everything project-specific that used to be hardcoded in
 * `lib/email-campaigns.ts` and the email actions lives here.
 *
 * ┌── Foundation contract ─────────────────────────────────────────────────┐
 * │ A consuming project ships its own copy of this file. The rest of the    │
 * │ `src/messaging/` module + the message-templates configurator are meant  │
 * │ to be copied verbatim and read only from here.                          │
 * └────────────────────────────────────────────────────────────────────────┘
 */

export type MessagingLocale = string

export interface FooterCopy {
  /** Why the recipient is getting this email (bulk footer line). */
  reason: string
  /** Lead-in to the contact address ("Questions? Reply or contact"). */
  contact: string
}

export interface MessagingConfig {
  /** Small uppercase label at the top of every branded email. */
  brandName: string
  /** Legal / org name shown in the footer line. */
  orgName: string
  /** Canonical public site; also the fallback for NEXT_PUBLIC_SITE_URL. */
  siteUrl: string
  /** Accent colour (links / brand label) used in the inline email HTML. */
  accentColor: string
  /** Locales the messaging stack supports; first entry is the default. */
  locales: readonly MessagingLocale[]
  /** Per-locale footer copy. Missing locales fall back to the default. */
  footer: Record<string, FooterCopy>
  /** Human names of each locale, for the AI-translation prompt. */
  localeNames: Record<string, string>
  /** One sentence describing the brand/voice for the AI translator. */
  aiBrandContext: string
  /** Anthropic model id used for AI translation. */
  aiModel: string
  /** app_settings keys the sender reads (sender address, reply-to, signature). */
  settingsKeys: {
    from: string
    replyTo: string
    signatureHtml: string
  }
  /** Supabase storage bucket for editor image uploads. */
  imageBucket: string
}

/** Live config for THIS project (Piedro Portal). */
export const MESSAGING_CONFIG: MessagingConfig = {
  brandName: 'Piedro Portal',
  orgName: 'Piedro International',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://portal.piedro.pt',
  accentColor: '#B8975A',
  locales: ['en', 'nl', 'fr', 'de'],
  footer: {
    en: { reason: 'You are receiving this email because you have a Piedro Portal account.', contact: 'Questions? Reply to this email or contact' },
    nl: { reason: 'U ontvangt deze e-mail omdat u een Piedro Portal-account heeft.', contact: 'Vragen? Beantwoord deze e-mail of neem contact op via' },
    fr: { reason: 'Vous recevez cet e-mail car vous disposez d’un compte Piedro Portal.', contact: 'Des questions ? Répondez à cet e-mail ou contactez' },
    de: { reason: 'Sie erhalten diese E-Mail, weil Sie ein Piedro Portal-Konto haben.', contact: 'Fragen? Antworten Sie auf diese E-Mail oder kontaktieren Sie' },
  },
  localeNames: { en: 'English', nl: 'Dutch', fr: 'French', de: 'German' },
  aiBrandContext: 'Piedro International, a Dutch orthopaedic footwear company (B2B portal for clinics)',
  aiModel: 'claude-opus-4-8',
  settingsKeys: {
    from: 'email_from',
    replyTo: 'broadcast_reply_to',
    signatureHtml: 'broadcast_signature_html',
  },
  imageBucket: 'email-assets',
}

/** Narrow an arbitrary locale string to a supported one (default otherwise). */
export function coerceLocale(locale: string | null | undefined): MessagingLocale {
  const l = (locale ?? '').toLowerCase()
  return MESSAGING_CONFIG.locales.includes(l) ? l : MESSAGING_CONFIG.locales[0]
}
