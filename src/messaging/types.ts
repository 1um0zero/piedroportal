/**
 * Messaging Foundation — shared, server-safe types (no React, no I/O).
 */

/** One locale variant of a template (subject + rich HTML body). */
export interface TemplateVariant {
  subject: string
  body_html: string
}

/** A saved, reusable message template. */
export interface MessageTemplate {
  id: string
  /** Stable slug for programmatic lookup (e.g. `order_confirmation`). */
  key: string
  name: string
  description: string | null
  /** Optional grouping label shown in the configurator. */
  category: string | null
  subject: string
  body_html: string
  /** Per-template signature; null → use the shared global signature. */
  signature_html: string | null
  /** Declared variable names the template expects, e.g. `['name','order_no']`. */
  variables: string[]
  /** Per-locale overrides keyed by locale code. */
  translations: Record<string, TemplateVariant> | null
  active: boolean
  updated_at: string
  created_at: string
}

/** Values injected into `{{placeholders}}` at render time. */
export type TemplateVars = Record<string, string | number | null | undefined>

/** Output of rendering a template: ready to hand to the mailer. */
export interface RenderedMessage {
  subject: string
  html: string
  text: string
}
