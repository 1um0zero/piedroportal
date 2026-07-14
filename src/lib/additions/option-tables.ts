// Shared constants + types for the editable addition-option tables
// (/admin/additions). Kept out of the 'use server' actions file, which may only
// export async functions.

/** The addition fields exposed as editable tables, in display order. */
export const ADDITION_TABLES = [
  { key: 'pu_type',     label: 'PU/EVA Bumper' },
  { key: 'sole_type',   label: 'Sole' },
  { key: 'runner_sole', label: 'Runner sole' },
  { key: 'spoiler',     label: 'Spoiler' },
] as const

export type AdditionFieldKey = (typeof ADDITION_TABLES)[number]['key']

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
