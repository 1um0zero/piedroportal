import 'server-only'

import { SECTIONS } from '@/components/order/additions-config'
import { CUSTOM_SECTIONS } from '@/components/custom/custom-additions-config'
import { createServiceClient } from '@/lib/supabase/service'
import { additionOptionImageUrl } from '@/lib/additions/option-image'
import type { OptionOverride, OptionOverrides } from '@/lib/additions/option-tables'

/**
 * Server-only source-of-truth resolver for seeding addition_field_options from
 * the live form configs. Each editable logical option-set (see option-tables.ts)
 * binds to a REPRESENTATIVE physical field in one of the two form configs; some
 * logical sets drive several physical fields that share the same list (noted in
 * `boundKeys` for the future form-wiring phase), so we read the list once from
 * the representative.
 *
 * This is how the DB stays a faithful mirror of the config with zero
 * transcription — the sync action reads values+images straight from here.
 */

interface Source {
  form: 'standard' | 'osb'
  /** Representative physical field key to read values+images from. */
  src: string
  /** All physical field keys this logical set feeds (for the wiring phase). */
  boundKeys: string[]
}

// logical field_key → representative physical field + all bound physical fields.
export const OPTION_SOURCES: Record<string, Source> = {
  // Standard order form (logical key === physical key)
  pu_type:     { form: 'standard', src: 'pu_type',     boundKeys: ['pu_type'] },
  sole_type:   { form: 'standard', src: 'sole_type',   boundKeys: ['sole_type'] },
  runner_sole: { form: 'standard', src: 'runner_sole', boundKeys: ['runner_sole'] },
  rocker:      { form: 'standard', src: 'rocker',      boundKeys: ['rocker'] },

  // OSB / custom form (logical key groups one or more cs-code physical fields)
  osb_last_height:         { form: 'osb', src: 'cs1.0.01_lf_rf',   boundKeys: ['cs1.0.01_lf_rf'] },
  osb_fitting_type:        { form: 'osb', src: 'cs1.41_type_ch',   boundKeys: ['cs1.41_type_ch'] },
  osb_toe_shape:           { form: 'osb', src: 'cs1.5_toe_shape',  boundKeys: ['cs1.5_toe_shape'] },
  osb_supplement_material: { form: 'osb', src: 'cs2.21.01_m_ch',   boundKeys: ['cs2.21.01_m_ch','cs2.23.01_m_ch','cs2.24.01_m_ch','cs2.25.01_m_ch','cs2.26.01_m_ch','cs2.27.01_m_ch','cs2.28.01_m_ch'] },
  osb_rocker:              { form: 'osb', src: 'cs2.41_ch',        boundKeys: ['cs2.41_ch','cs4.rocker_type'] },
  osb_lining:              { form: 'osb', src: 'cs3.lining_ch',    boundKeys: ['cs3.lining_ch'] },
  osb_laces_type:          { form: 'osb', src: 'cs3.cl_laces_type', boundKeys: ['cs3.cl_laces_type'] },
  osb_velcro_type:         { form: 'osb', src: 'cs3.cl_velcro_type', boundKeys: ['cs3.cl_velcro_type'] },
  osb_velcro_passant:      { form: 'osb', src: 'cs3.cl_velcro_passant', boundKeys: ['cs3.cl_velcro_passant'] },
  osb_zipper_side:         { form: 'osb', src: 'cs3.cl_zipper_l',  boundKeys: ['cs3.cl_zipper_l','cs3.cl_zipper_r'] },
  osb_collar_padding:      { form: 'osb', src: 'cs3.collar_padding_mm', boundKeys: ['cs3.collar_padding_mm'] },
  osb_tongue_padding:      { form: 'osb', src: 'cs3.tongue_padding_mm', boundKeys: ['cs3.tongue_padding_mm'] },
  osb_tongue_reinforce:    { form: 'osb', src: 'cs3.tongue_reinforce_opt', boundKeys: ['cs3.tongue_reinforce_opt'] },
  osb_stiffener_type:      { form: 'osb', src: 'cs5.stiffener_type_l', boundKeys: ['cs5.stiffener_type_l','cs5.stiffener_type_r'] },
  osb_stiffener_material:  { form: 'osb', src: 'cs5.stiffener_material_l', boundKeys: ['cs5.stiffener_material_l','cs5.stiffener_material_r'] },
  osb_toe_option:          { form: 'osb', src: 'cs5.toe_option',   boundKeys: ['cs5.toe_option'] },
}

const standardFields = () => SECTIONS.flatMap(s => s.fields)
const customFields = () => CUSTOM_SECTIONS.flatMap(s => s.groups.flatMap(g => g.fields))

/**
 * DB-driven option overrides for the OSB/custom form (Phase 3 wiring), keyed by
 * PHYSICAL field key. Each OSB logical set's active rows (sorted) are expanded to
 * every physical field it feeds (boundKeys). A logical set with NO rows is
 * omitted, so the form falls back to its static config — nothing breaks if the
 * admin hasn't run "Sync from config" yet.
 */
export async function getOsbOptionOverrides(): Promise<OptionOverrides> {
  const osbKeys = Object.entries(OPTION_SOURCES).filter(([, s]) => s.form === 'osb').map(([k]) => k)
  const service = createServiceClient()
  const { data } = await service
    .from('addition_field_options')
    .select('field_key, value, image_path, label_nl, label_fr, label_de, sort_order')
    .in('field_key', osbKeys)
    .eq('active', true)
    .order('sort_order', { ascending: true })

  const byLogical: Record<string, OptionOverride[]> = {}
  for (const r of (data ?? []) as Array<{ field_key: string; value: string; image_path: string | null; label_nl: string | null; label_fr: string | null; label_de: string | null }>) {
    ;(byLogical[r.field_key] ??= []).push({
      value: r.value,
      image: additionOptionImageUrl(r.image_path),
      label_nl: r.label_nl,
      label_fr: r.label_fr,
      label_de: r.label_de,
    })
  }

  const out: OptionOverrides = {}
  for (const [logical, source] of Object.entries(OPTION_SOURCES)) {
    if (source.form !== 'osb') continue
    const opts = byLogical[logical]
    if (!opts?.length) continue
    for (const physical of source.boundKeys) out[physical] = opts
  }
  return out
}

/** Values + per-value image path for a logical option-set, read from the config. */
export function optionSource(logicalKey: string): { values: string[]; images: Record<string, string> } | null {
  const source = OPTION_SOURCES[logicalKey]
  if (!source) return null
  const field = (source.form === 'standard' ? standardFields() : customFields()).find(f => f.key === source.src)
  if (!field) return null
  const values = (field.values ?? []).map(v => String(v))
  const images = (field.images ?? {}) as Record<string, string>
  return { values, images }
}
