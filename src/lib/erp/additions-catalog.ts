// ─────────────────────────────────────────────────────────────────────────────
// Additions catalog — the canonical, always-current description of EVERY addition
// field the portal knows about, for the A-Shell / VSI side (dsv) to pull and map.
//
// This is the machine-readable half of the "additions change → prepare everything
// for dsv" rule (see docs/erp/ADDITIONS-FOR-DSV.md). It is GENERATED from the two
// config files that are the single source of truth, so it can never drift:
//   • OSB     — src/components/order/additions-config.ts        (SECTIONS)
//   • CUSTOM  — src/components/custom/custom-additions-config.ts (CUSTOM_SECTIONS)
//
// The `key` of each entry is exactly the `field` the ERP order contract emits
// (explodeAdditions → /api/erp/orders), so dsv keys its A-Shell mapping on it.
// dsv does NOT read this file directly — it GETs /api/erp/additions.
// ─────────────────────────────────────────────────────────────────────────────

import { createHash } from 'crypto'
import { SECTIONS, type AdditionField } from '@/components/order/additions-config'
import { CUSTOM_SECTIONS, type CustomField, type CustomI18n } from '@/components/custom/custom-additions-config'
import enMessages from '../../../messages/en.json'
import nlMessages from '../../../messages/nl.json'
import frMessages from '../../../messages/fr.json'
import deMessages from '../../../messages/de.json'

// Bump when the SHAPE of a catalog entry changes (fields added/renamed), so dsv
// can guard on it. Value drift (a new addition, a relabel) is tracked by `hash`.
export const ADDITIONS_CATALOG_VERSION = 1

type Locale = 'en' | 'nl' | 'fr' | 'de'
type LabelMap = Record<string, string>
const osbLabels: Record<Locale, LabelMap> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  en: (enMessages as any).additions?.field_labels ?? {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nl: (nlMessages as any).additions?.field_labels ?? {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fr: (frMessages as any).additions?.field_labels ?? {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  de: (deMessages as any).additions?.field_labels ?? {},
}

const cleanLabel = (s: string): string =>
  String(s).replace(/↳\s*/g, '').replace(/\s*\(mm\)/gi, '').trim()

/** One addition as the ERP/A-Shell side sees it. */
export interface CatalogEntry {
  channel: 'osb' | 'custom'
  section: string                        // portal section key
  key: string                            // portal field key === ERP contract `field`
  type: string                           // mm | option | toggle | text | image | upload | leather-pieces
  side: string                           // both (l/r) | global | left | right
  parent: string | null                  // conditionalOn parent, if a child field
  values: (string | number)[] | null     // option/mm choice list, when fixed
  unit: string | null                    // e.g. 'mm'
  dataverse_key: string | null           // legacy Dataverse column (osb only)
  labels: Record<Locale, string>         // en/nl/fr/de
}

function osbEntry(section: string, f: AdditionField): CatalogEntry {
  return {
    channel: 'osb',
    section,
    key: f.key,
    type: f.type,
    side: f.side,
    parent: f.conditionalOn ?? null,
    values: f.values ?? null,
    unit: f.type === 'mm' ? 'mm' : null,
    dataverse_key: f.dataverseKey ?? f.dataverse ?? null,
    labels: {
      en: cleanLabel(osbLabels.en[f.key] ?? f.key),
      nl: cleanLabel(osbLabels.nl[f.key] ?? osbLabels.en[f.key] ?? f.key),
      fr: cleanLabel(osbLabels.fr[f.key] ?? osbLabels.en[f.key] ?? f.key),
      de: cleanLabel(osbLabels.de[f.key] ?? osbLabels.en[f.key] ?? f.key),
    },
  }
}

function customEntry(section: string, f: CustomField): CatalogEntry {
  const l = f.label as CustomI18n
  return {
    channel: 'custom',
    section,
    key: f.key,
    type: f.type,
    side: f.side,
    parent: f.conditionalOn ?? null,
    values: f.values ?? null,
    unit: f.unit ?? (f.type === 'mm' ? 'mm' : null),
    dataverse_key: null,
    labels: {
      en: cleanLabel(l.en),
      nl: cleanLabel(l.nl ?? l.en),
      fr: cleanLabel(l.fr ?? l.en),
      de: cleanLabel(l.de ?? l.en),
    },
  }
}

/** Build the full catalog (OSB first, then CUSTOM), in config order. */
export function buildAdditionsCatalog(): CatalogEntry[] {
  const out: CatalogEntry[] = []
  for (const s of SECTIONS) for (const f of s.fields) out.push(osbEntry(s.key, f))
  for (const s of CUSTOM_SECTIONS) for (const g of s.groups) for (const f of g.fields) out.push(customEntry(s.key, f))
  return out
}

/** Stable content hash — changes whenever any entry (key, type, values, label…)
 *  changes, so dsv can detect "there is new addition info" with one comparison. */
export function additionsCatalogHash(entries: CatalogEntry[] = buildAdditionsCatalog()): string {
  const json = JSON.stringify(entries)
  return createHash('sha256').update(json).digest('hex').slice(0, 16)
}
