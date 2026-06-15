/**
 * Sole profiles — per-model restriction of the sole-amendment options.
 *
 * Source of truth: the "Zolen Piedro" master (docs/sole-hierarchy/Zolen Piedro.xlsx),
 * compiled into sole-profile-data.ts by scripts/gen-sole-profiles.mjs. See
 * docs/sole-hierarchy/zolen-master.md and zolen-canonical-map.md.
 *
 * Model (style_name, K/B-insensitive) → sole GROUP → allowed canonical option values
 * per underlying additions-config field (pu_type / sole_type / runner_sole; spoiler is
 * never used by Zolen, so it is hidden for any profiled model). A model WITHOUT a group
 * keeps the full option lists (general rule = current behaviour) — unclassified / pending
 * models are never broken.
 *
 * Values stored remain the Dataverse-canonical option-set labels (ERP-safe); the Zolen
 * names are display/catalogue labels reconciled at generation time. ~11 genuinely-new
 * Zolen values are dropped pending Dataverse option codes (see zolen-canonical-map.md).
 */
import { PROFILE_OPTIONS, PROFILE_STYLES, SOLE_GROUP_LABELS } from './sole-profile-data'

export { PROFILE_OPTIONS, PROFILE_STYLES, SOLE_GROUP_LABELS }

/** Config fields the profiles control. A controlled field not allowed by a group is hidden. */
export const SOLE_CONTROLLED_KEYS = ['pu_type', 'sole_type', 'spoiler', 'runner_sole'] as const
export type SoleControlledKey = typeof SOLE_CONTROLLED_KEYS[number]

/** Toggle → its controlled child fields (for show/hide of the parent checkbox). */
const TOGGLE_CHILDREN: Record<string, SoleControlledKey[]> = {
  pu_bumper: ['pu_type'],
  amend_sole: ['sole_type', 'spoiler', 'runner_sole'],
}

// Flat index: base style_name → group key (a style belongs to exactly one group).
const STYLE_TO_PROFILE: Record<string, string> = {}
for (const [group, styles] of Object.entries(PROFILE_STYLES))
  for (const s of styles) STYLE_TO_PROFILE[s] = group

/** Strip the trailing K/B scale-variant suffix to get the base style code. */
export function baseStyle(styleName: string | null | undefined): string {
  return (styleName ?? '').replace(/[KB]$/, '')
}

/** The sole group key for a model, or null (→ general rule, full options). */
export function soleProfileFor(styleName: string | null | undefined): string | null {
  if (!styleName) return null
  return STYLE_TO_PROFILE[styleName] ?? STYLE_TO_PROFILE[baseStyle(styleName)] ?? null
}

/**
 * Filter a controlled field's option list by the active group.
 * - no group, or non-controlled field → full list unchanged.
 * - group allows '*' for the field → full list (shown, unrestricted).
 * - group lists values for the field → intersection (preserves config order).
 * - field not listed for the group → [] (caller hides the field).
 */
export function allowedSoleValues(profileKey: string | null, fieldKey: string, fullValues: string[]): string[] {
  if (!profileKey) return fullValues
  if (!(SOLE_CONTROLLED_KEYS as readonly string[]).includes(fieldKey)) return fullValues
  const allowed = PROFILE_OPTIONS[profileKey]?.[fieldKey as Exclude<SoleControlledKey, 'spoiler'>]
  if (allowed === '*') return fullValues
  if (!allowed) return []
  return fullValues.filter(v => allowed.includes(v))
}

/** Whether a sole field (controlled field OR its parent toggle) is hidden for a group. */
export function soleFieldHidden(profileKey: string | null, fieldKey: string, fullValues?: string[]): boolean {
  if (!profileKey) return false
  if (TOGGLE_CHILDREN[fieldKey])
    return TOGGLE_CHILDREN[fieldKey].every(k => fieldEmpty(profileKey, k))
  if ((SOLE_CONTROLLED_KEYS as readonly string[]).includes(fieldKey))
    return fieldEmpty(profileKey, fieldKey as SoleControlledKey, fullValues)
  return false
}

function fieldEmpty(profileKey: string, key: SoleControlledKey, fullValues?: string[]): boolean {
  const allowed = PROFILE_OPTIONS[profileKey]?.[key as Exclude<SoleControlledKey, 'spoiler'>]
  if (allowed === '*') return false          // unrestricted → shown
  if (!allowed) return true                  // not listed → hidden
  if (!fullValues) return allowed.length === 0
  return fullValues.filter(v => allowed.includes(v)).length === 0
}
