/**
 * ZSM sole profiles — the ZSM-exclusive Prefab Sole + Sole Sheet selectors.
 *
 * Source of truth: docs/legacy/additions-builder.js (Power Pages) — arrays
 * `array_ZSM_colours`, `array_ZSM_sole_sheet_colours`, `array_ZSM_prefab_sole`
 * + the per-model Sneaker/Runner split (Anabela e-mails, 2026-06-17, confirmed
 * against the legacy data). See docs/sole-hierarchy/dependencies.md.
 *
 * On ZSM models (B-prefix styles) the normal sole-amendment fields (PU/EVA
 * Bumper + Amendment Sole / spoiler / runner_sole) are REPLACED by:
 *   • Amendment Prefab Sole (toggle) → Prefab Sole (colour, by Sneaker/Runner group)
 *   • Amendment Sole Sheet (toggle) → Sole Sheet (type) → Colour (subset by type)
 * All sided (L/R). The rest of the sole section (rocker, floats, wedges, carbon,
 * sach, separate, thomas) is unchanged. Non-ZSM models never see these fields.
 */

export type ZsmGroup = 'sneaker' | 'runner'

// ── Per-model Sneaker/Runner split (base style_name, B-prefix) ──────────────────
// "Option ZSM 1" (Sneaker) vs "Option ZSM 2" (Runner) — Anabela 2026-06-17.
const ZSM_SNEAKER_STYLES = [
  'B5760', 'B5761', 'B5715', 'B5716', 'B5725', 'B5726',
]
const ZSM_RUNNER_STYLES = [
  'B5748', 'B5749', 'B5758', 'B5759', 'B5746', 'B5747', 'B5750', 'B5751', 'B5732', 'B5733',
  'B5740', 'B5741', 'B5762', 'B5763', 'B5727', 'B5728', 'B5723', 'B5724', 'B5744', 'B5745',
  'B5734', 'B5735', 'B5742', 'B5743', 'B5754', 'B5755', 'B5713', 'B5714', 'B5764', 'B5765',
  'B5756', 'B5757', 'B5730', 'B5731', 'B5752', 'B5753',
]

const STYLE_TO_GROUP: Record<string, ZsmGroup> = {}
for (const s of ZSM_SNEAKER_STYLES) STYLE_TO_GROUP[s] = 'sneaker'
for (const s of ZSM_RUNNER_STYLES)  STYLE_TO_GROUP[s] = 'runner'

/** Strip a trailing K/B scale-variant suffix to get the base style code. */
function baseStyle(styleName: string | null | undefined): string {
  return (styleName ?? '').trim().toUpperCase().replace(/[KB]$/, '')
}

/** The ZSM prefab group for a model (sneaker/runner), or null if not a ZSM model. */
export function zsmGroupFor(styleName: string | null | undefined): ZsmGroup | null {
  if (!styleName) return null
  const s = (styleName).trim().toUpperCase()
  return STYLE_TO_GROUP[s] ?? STYLE_TO_GROUP[baseStyle(s)] ?? null
}

export function isZsmModel(styleName: string | null | undefined): boolean {
  return zsmGroupFor(styleName) !== null
}

// ── Prefab Sole colours, by group (values are ERP-canonical labels) ─────────────
export const ZSM_PREFAB_OPTIONS: Record<ZsmGroup, string[]> = {
  sneaker: ['Sneaker White 09', 'Sneaker Light Beige 19', 'Sneaker Black 81'],
  runner:  ['Runner White 09', 'Runner Light Grey 56', 'Runner Black 81'],
}

/** Prefab Sole options for a model (by its group), or [] if not ZSM. */
export function zsmPrefabOptions(styleName: string | null | undefined): string[] {
  const g = zsmGroupFor(styleName)
  return g ? ZSM_PREFAB_OPTIONS[g] : []
}

// ── Sole Sheet colour universe (code → label), legacy array_ZSM_colours order ──
// 1-based index → label (the index is how the sheet-type table references colours).
const ZSM_COLOURS: string[] = [
  '09 White', '17 Beige', '19 Light Beige', '30 Honey', '32 Yellow', '34 Orange',
  '35 Mid Brown', '38 Green', '41 Taupe', '46 Brown', '56 Grey', '78 Blue',
  '81 Black', '102 Red', '103 Blue',
]

// ── Sole Sheet types (display order) + their allowed colour subset ──────────────
// Each entry: [type label, 1-based colour indices into ZSM_COLOURS]. Faithful to
// legacy array_ZSM_sole_sheet_colours (option-set 979580001..020, in order).
const ZSM_SHEET_TYPE_TABLE: [string, number[]][] = [
  ['EVA Lavero Soft 6 mm',              [1, 2, 3, 7, 9, 10, 11, 12]],
  ['EVA Lavero Soft 8 mm',              [10, 13]],
  ['EVA Mandorlo 6 mm',                 [10, 13]],
  ['Optimum 6 mm',                      [1, 2, 3, 7, 9, 10, 11, 13]],
  ['Vibram 8870 5 mm',                  [10, 13]],
  ['Vibram 8860 6 mm',                  [10, 13]],
  ['EVA Rubber Astro Star 4 mm',        [1, 2, 3, 7, 9, 10, 11, 12, 13]],
  ['EVA Rubber Astro Star 6 mm',        [1, 2, 3, 7, 9, 10, 11, 12, 13]],
  ['EVA Rubber Astrolight Delta 4 mm',  [1, 2, 3, 7, 9, 10, 13]],
  ['EVA Rubber Astrolight Delta 6 mm',  [1, 2, 3, 7, 9, 10, 13]],
  ['EVA Rubber Anna 4 mm',              [1, 2, 3, 7, 9, 10, 11, 12, 13]],
  ['EVA Rubber Anna 6 mm',              [1, 2, 3, 7, 9, 10, 11, 12, 13]],
  ['Lavero Flex Rubber 4 mm',           [1, 2, 3, 7, 9, 10, 11, 12, 13]],
  ['Lavero Flex Rubber 6 mm',           [1, 2, 3, 7, 9, 10, 11, 12, 13]],
  ['Rubber Tire 6 mm',                  [4, 10, 13]],
  ['Vibram 2002 6 mm',                  [10, 13]],
  ['Jony Sole 6 mm',                    [1, 2, 3, 4, 10, 11, 13]],
  ['Astrolight Delta 6 mm',             [14, 15]],
  ['Tire 8 mm',                         [6, 5, 10, 13, 14, 15]],
  // Sportflex includes 56 Grey (index 11) — legacy omitted it; corrected by Anabela 2026-06-17.
  ['Sportflex 8 mm',                    [1, 5, 6, 8, 10, 11, 13, 14, 15]],
]

/** All Sole Sheet type labels, in display order. */
export const ZSM_SHEET_TYPES: string[] = ZSM_SHEET_TYPE_TABLE.map(([t]) => t)

/** Numeric code that prefixes a colour label ("102 Red" → 102), for ascending sort. */
const colourCode = (label: string): number => parseInt(label, 10)

// Colours within each sheet type are shown in ASCENDING code order (Anabela 2026-06-17).
const SHEET_TYPE_TO_COLOURS: Record<string, string[]> = {}
for (const [type, idx] of ZSM_SHEET_TYPE_TABLE)
  SHEET_TYPE_TO_COLOURS[type] = idx
    .map(i => ZSM_COLOURS[i - 1])
    .sort((a, b) => colourCode(a) - colourCode(b))

/** The allowed Colour labels for a selected Sole Sheet type ([] if unknown/none). */
export function zsmSheetColours(sheetType: string | null | undefined): string[] {
  if (!sheetType) return []
  return SHEET_TYPE_TO_COLOURS[sheetType] ?? []
}

/** Every sole-sheet colour label (ascending by code) — the superset for config/PDF. */
export const ZSM_ALL_SHEET_COLOURS: string[] = [...ZSM_COLOURS].sort(
  (a, b) => colourCode(a) - colourCode(b),
)

/** Every prefab option label (Sneaker + Runner) — the superset for config/PDF. */
export const ZSM_ALL_PREFAB_OPTIONS: string[] = [
  ...ZSM_PREFAB_OPTIONS.sneaker, ...ZSM_PREFAB_OPTIONS.runner,
]

// ── Field keys (kept together so the form/config/validation agree) ──────────────
export const ZSM_FIELD_KEYS = {
  prefabToggle: 'zsm_prefab',
  prefabColour: 'zsm_prefab_colour',
  sheetToggle:  'zsm_sheet',
  sheetType:    'zsm_sheet_type',
  sheetColour:  'zsm_sheet_colour',
} as const

export const ZSM_FIELD_KEY_SET: Set<string> = new Set(Object.values(ZSM_FIELD_KEYS))

/** Normal sole-amendment fields that ZSM models REPLACE (hidden on ZSM models). */
export const ZSM_REPLACED_KEYS: Set<string> = new Set([
  'pu_bumper', 'pu_type', 'amend_sole', 'sole_type', 'spoiler', 'runner_sole',
])
