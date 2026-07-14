// Registry of the editable addition option-sets shown at /admin/additions.
//
// Each entry is a LOGICAL option-set with a stable `key` (= addition_field_options
// .field_key). Some logical sets are fed by several physical form fields that
// share the same list (e.g. the Contreforts set drives both stiffener_type_l and
// _r) — that binding lives in the server-only seed map (option-seed.ts), which
// reads the real values+images from the form configs. This file is the shared
// (client+server) metadata that drives the back-office tabs; it intentionally
// does NOT import the heavy form configs.
//
// Kept out of the 'use server' actions file, which may only export async fns.

export type AdditionForm = 'standard' | 'osb'

export interface AdditionTableDef {
  key:       string        // logical field_key
  label:     string        // tab label
  form:      AdditionForm  // top-level split
  group:     string        // sub-heading within the form
  hasImages: boolean       // whether options carry images (drives default Cards view)
}

/**
 * Scope (Jorge, 2026-07-14): the 4 original sole-amendment sets + the standard
 * `rocker` (image), plus EVERY option-type field of the OSB/custom form. The
 * standard imageless option fields (lining, closures…) are deliberately left out
 * for now.
 */
export const ADDITION_TABLES: AdditionTableDef[] = [
  // ── Standard order form ────────────────────────────────────────────────────
  { key: 'pu_type',     label: 'PU/EVA Bumper', form: 'standard', group: 'Sole', hasImages: true },
  { key: 'sole_type',   label: 'Sole',          form: 'standard', group: 'Sole', hasImages: false },
  { key: 'runner_sole', label: 'Runner sole',   form: 'standard', group: 'Sole', hasImages: true },
  { key: 'spoiler',     label: 'Spoiler',       form: 'standard', group: 'Sole', hasImages: false },
  { key: 'rocker',      label: 'Rocker sole',   form: 'standard', group: 'Sole', hasImages: true },

  // ── OSB / custom-made form ─────────────────────────────────────────────────
  { key: 'osb_last_height',        label: 'Last height',          form: 'osb', group: 'Last & Fitting',     hasImages: false },
  { key: 'osb_fitting_type',       label: 'Fitting shoe type',    form: 'osb', group: 'Last & Fitting',     hasImages: false },
  { key: 'osb_toe_shape',          label: 'Toe shape',            form: 'osb', group: 'Last & Fitting',     hasImages: true },
  { key: 'osb_supplement_material', label: 'Supplement material', form: 'osb', group: 'Supplement',         hasImages: false },
  { key: 'osb_rocker',             label: 'Rocker type',          form: 'osb', group: 'Supplement',         hasImages: true },
  { key: 'osb_lining',             label: 'Lining',               form: 'osb', group: 'Upper',              hasImages: false },
  { key: 'osb_laces_type',         label: 'Laces type',           form: 'osb', group: 'Upper',              hasImages: false },
  { key: 'osb_velcro_type',        label: 'Velcro type',          form: 'osb', group: 'Upper',              hasImages: false },
  { key: 'osb_velcro_passant',     label: 'Velcro passant side',  form: 'osb', group: 'Upper',              hasImages: false },
  { key: 'osb_zipper_side',        label: 'Zipper side',          form: 'osb', group: 'Upper',              hasImages: false },
  { key: 'osb_collar_padding',     label: 'Collar padding',       form: 'osb', group: 'Upper',              hasImages: false },
  { key: 'osb_tongue_padding',     label: 'Tongue padding',       form: 'osb', group: 'Upper',              hasImages: false },
  { key: 'osb_tongue_reinforce',   label: 'Tongue reinforcement', form: 'osb', group: 'Upper',              hasImages: false },
  { key: 'osb_stiffener_type',     label: 'Contreforts (stiffener)', form: 'osb', group: 'Stiffeners & Toe', hasImages: true },
  { key: 'osb_stiffener_material', label: 'Stiffener material',   form: 'osb', group: 'Stiffeners & Toe',   hasImages: false },
  { key: 'osb_toe_option',         label: 'Toe reinforcement',    form: 'osb', group: 'Stiffeners & Toe',   hasImages: false },
]

export const ADDITION_FIELD_KEYS = new Set<string>(ADDITION_TABLES.map(t => t.key))

export interface AdditionOption {
  id: string
  field_key: string
  value: string
  family: string | null
  sort_order: number
  image_path: string | null
  label_nl: string | null
  label_fr: string | null
  label_de: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface SaveAdditionOptionInput {
  id?: string
  field_key: string
  value: string
  family?: string | null
  label_nl?: string | null
  label_fr?: string | null
  label_de?: string | null
  active?: boolean
}
