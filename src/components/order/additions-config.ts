// Config-driven additions form — sourced from Power Pages JS + Dataverse picklist metadata

export type FieldType = 'mm' | 'option' | 'toggle' | 'text' | 'image'
export type SideType  = 'both' | 'global'

export interface AdditionField {
  key:             string
  label:           string         // English label
  labelNl?:        string
  labelFr?:        string
  labelDe?:        string
  type:            FieldType
  side:            SideType
  values?:         (number | string)[]
  conditionalOn?:  string         // show only when this sibling key is truthy
  dataverseKey?:   string         // Dataverse column name (without lf/rf suffix)
  dataverse?:      string         // for global (non-sided) fields
  closureOnly?:    'LACE' | 'VELCRO'  // show only when product has this closure
  collapse?:       boolean        // hide other chips once one is selected
  glb?:            { l: string; r: string }  // 3D model filenames in Supabase products/3d/
}

export interface AdditionSection {
  key:    string
  label:  string
  labelNl?: string
  labelFr?: string
  labelDe?: string
  fields: AdditionField[]
}

// ── mm options (shorthand) ────────────────────────────────────────────────────
const mm1to10   = [1,2,3,4,5,6,7,8,9,10]
const mm4to10   = [4,6,8,10]
const mm2to8    = [2,4,6,8]
const mm1to20   = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]

export const SECTIONS: AdditionSection[] = [
  // ── Section 1: Additions ──────────────────────────────────────────────────
  {
    key: 'additions', label: 'Additions',
    labelNl: 'Leest Aanpassingen', labelFr: 'Suppléments', labelDe: 'Ergänzungen',
    fields: [
      { key: 'lat_joint_w',  label: 'Lateral Joint Width (mm)',    labelNl: 'Lateraal Bal Verbreding',       type: 'mm',  side: 'both',  values: mm1to10,  dataverseKey: 'cr56f_lateraljointwidth',     glb: { l: 'joint_lateral_l.glb',   r: 'joint_lateral_r.glb' } },
      { key: 'med_joint_w',  label: 'Medial Joint Width (mm)',     labelNl: 'Mediaal Bal Verbreding',        type: 'mm',  side: 'both',  values: mm1to10,  dataverseKey: 'cr56f_medialjointwidth',      glb: { l: 'joint_medial_l.glb',    r: 'joint_medial_r.glb' } },
      { key: 'lat_heel_w',   label: 'Lateral Heel Width (mm)',     labelNl: 'Lateraal Hiel Verbreding',      type: 'mm',  side: 'both',  values: mm1to10,  dataverseKey: 'cr56f_lateralheelwidth',      glb: { l: 'heel_lateral_l.glb',    r: 'heel_lateral_r.glb' } },
      { key: 'med_heel_w',   label: 'Medial Heel Width (mm)',      labelNl: 'Mediaal Hiel Verbreding',       type: 'mm',  side: 'both',  values: mm1to10,  dataverseKey: 'cr56f_medialheelwidth',       glb: { l: 'heel_medial_l.glb',     r: 'heel_medial_r.glb' } },
      { key: 'hammer_toe',   label: 'Hammer Toe (mm)',             labelNl: 'Hamer Tenen',                   type: 'mm',  side: 'both',  values: mm4to10,  dataverseKey: 'cr56f_2hammertoe',            glb: { l: 'hammer_toe_l.glb',      r: 'hammer_toe_r.glb' } },
      { key: 'toe_box',      label: 'Toe Box (mm)',                labelNl: 'Teenhoogte',                    type: 'mm',  side: 'both',  values: mm1to10,  dataverseKey: 'cr56f_2toebox',               glb: { l: 'toe_box_l.glb',         r: 'toe_box_r.glb' } },
      { key: 'bunionette',   label: 'Bunionette (mm)',             labelNl: 'Bunionette',                    type: 'mm',  side: 'both',  values: mm4to10,  dataverseKey: 'cr56f_2bunionette',           glb: { l: 'bunionette_l.glb',      r: 'bunionette_r.glb' } },
      { key: 'hallux_v',     label: 'Hallux Valgus (mm)',          labelNl: 'Hallux Valgus',                 type: 'mm',  side: 'both',  values: mm4to10,  dataverseKey: 'cr56f_2halluxvalgus',         glb: { l: 'hallux_valgus_l.glb',   r: 'hallux_valgus_r.glb' } },
      { key: 'depth_fore',   label: 'Depth to Forepart (mm)',      labelNl: 'Voorvoet Verdieping',           type: 'mm',  side: 'both',  values: mm2to8,   dataverseKey: 'cr56f_2depthtoforepart',      glb: { l: 'depth_forefoot_l.glb',  r: 'depth_forefoot_r.glb' } },
      { key: 'depth_toe',    label: 'Depth to Toe Heel (mm)',      labelNl: 'Totaal Verdieping',             type: 'mm',  side: 'both',  values: mm2to8,   dataverseKey: 'cr56f_2depthtotoeheel',       glb: { l: 'depth_plantair_l.glb',  r: 'depth_plantair_r.glb' } },
      { key: 'xw_cone',      label: 'Extra Width on Cone (mm)',    labelNl: 'Wreefkap',                      type: 'mm',  side: 'both',  values: mm1to20,  dataverseKey: 'cr56f_2extrawidthoncone',     glb: { l: 'width_cone_l.glb',      r: 'width_cone_r.glb' } },
      { key: 'str_heel',     label: 'Straighten Heel Clip (mm)',   labelNl: '90° Hiel Lijn',                 type: 'mm',  side: 'both',  values: mm2to8,   dataverseKey: 'cr56f_2straightenheelclip',   glb: { l: 'straighten_heel_l.glb', r: 'straighten_heel_r.glb' } },
      { key: 'heel_depth',   label: 'Heel Depth Only (mm)',        labelNl: 'Verdieping Hak',                type: 'mm',  side: 'both',  values: mm2to8,   dataverseKey: 'cr56f_2heeldepthonly',        glb: { l: 'heel_depth_l.glb',      r: 'heel_depth_r.glb' } },
      // Haglund + conditionals
      { key: 'haglund',      label: 'Haglund Heel Exostosis (mm)', labelNl: 'Haglund Exostosis',             type: 'mm',  side: 'both',  values: mm4to10,  dataverseKey: 'cr56f_2haglundheelexostosis', glb: { l: 'heel_exostosis_l.glb',  r: 'heel_exostosis_r.glb' } },
      { key: 'haglund_h',    label: '↳ Haglund Height (mm)',       labelNl: 'Haglund hoogte',                type: 'mm',  side: 'both',  values: mm4to10,  conditionalOn: 'haglund', dataverseKey: 'cr56f_3haglund_height_conditional' },
      { key: 'haglund_p',    label: '↳ Haglund Position (mm)',     labelNl: 'Haglund positie',               type: 'mm',  side: 'both',  values: mm4to10,  conditionalOn: 'haglund', dataverseKey: 'cr56f_3haglund_position_conditional' },
      // Medial Ankle + conditional height
      { key: 'xs_med_ank',   label: 'Extra Space Medial Ankle (mm)',labelNl: 'Extra ruimte mediale enkel',   type: 'text', side: 'both', dataverseKey: 'cr56f_3extraspacemedialankle', glb: { l: 'ankle_medial_l.glb',    r: 'ankle_medial_r.glb' } },
      { key: 'med_ank_h',    label: '↳ Medial Ankle Height (mm)',  labelNl: 'Mediale enkelhoogte',           type: 'text', side: 'both', conditionalOn: 'xs_med_ank', dataverseKey: 'cr56f_3mankle_height_conditional' },
      // Lateral Ankle + conditional height
      { key: 'xs_lat_ank',   label: 'Extra Space Lateral Ankle (mm)',labelNl:'Extra ruimte laterale enkel', type: 'text', side: 'both', dataverseKey: 'cr56f_3extraspacelateralankle', glb: { l: 'ankle_lateral_l.glb',   r: 'ankle_lateral_r.glb' } },
      { key: 'lat_ank_h',    label: '↳ Ankle Height (mm)',         labelNl: 'Enkelhoogte',                   type: 'text', side: 'both', conditionalOn: 'xs_lat_ank', dataverseKey: 'cr56f_3ankle_height_conditional' },
    ],
  },

  // ── Section 2: Upper Adaptions ────────────────────────────────────────────
  {
    key: 'upper', label: 'Upper Adaptions',
    labelNl: 'Schacht aanpassingen', labelFr: 'Principaux ajustements', labelDe: 'Anpassungen am Schaft',
    fields: [
      { key: 'lining',       label: 'Lining',                      labelNl: 'Voering',                       type: 'option', side: 'both', collapse: true, values: ['Leather','Synthetic Fur','Real Fur','Sympatex','Diabetic','Microfiber'], dataverseKey: 'cr56f_lining' },
      { key: 'cl_laces',     label: 'Closure Laces',               labelNl: 'Vetersluiting',                 type: 'option', side: 'both', collapse: true, closureOnly: 'LACE', values: ['Eyelets','Hooks','D-Rings','Blind Eyelets','Buckle & Strap','Twist Lock System'], dataverseKey: 'cr56f_closurelaces' },
      { key: 'cl_velcro',    label: 'Closure Velcro Straps',       labelNl: 'Klittenbandsluiting',           type: 'option', side: 'both', collapse: true, closureOnly: 'VELCRO', values: ['Return Velcro','Lap-Over Velcro','Single Hand Velcro','Velcro Separate'], dataverseKey: 'cr56f_closurevelcrostraps' },
      { key: 'stiff_hard',   label: 'Stiffener Hardness',          labelNl: 'Contrefort Hardheid',           type: 'option', side: 'both', collapse: true, values: ['Soft - 1.0 mm','Standard - 1.5 mm','Hard - 1.9 mm','Double - 2 x 1.5 mm','Extra padding - 6 mm'], dataverseKey: 'cr56f_stiffenerhardness' },
      { key: 'toe_puffs',    label: 'Toe Puffs',                   labelNl: 'Neuskap',                       type: 'option', side: 'both', collapse: true, values: ['Soft - 0.5 mm','Standard - 0.8 mm','Hard - 0.9 mm'], dataverseKey: 'cr56f_toepuffs' },
      { key: 'toe_puffs_rim',label: 'Toe Puffs Rim',               labelNl: 'Vleugel Neus',                  type: 'toggle', side: 'both', dataverseKey: 'cr56f_toepuffsrim' },
      { key: 'str_leather',  label: 'Stretch Leather',             labelNl: 'Stretch leer',                  type: 'toggle', side: 'both', dataverseKey: 'cr56f_stretchleather' },
      { key: 'instep_front', label: 'Instep more to the front',    labelNl: 'Inschot meer naar voren',       type: 'text',   side: 'both', dataverseKey: 'cr56f_instepmoretothefront' },
      { key: 'colour_mod',   label: 'Colour modifications',        labelNl: 'Kleurwijzigingen',              type: 'text',   side: 'both', dataverseKey: 'cr56f_colourmodifications' },
      { key: 'pad_tongue',   label: 'Extra padding on tongue (mm)',labelNl: 'Extra tongpolstering',          type: 'mm',     side: 'both', values: mm4to10, dataverseKey: 'cr56f_extrapaddingontongue' },
      { key: 'zipper',       label: 'Zipper',                      labelNl: 'Rits',                          type: 'option', side: 'both', collapse: true, values: ['Medial (next to closure)','Medial (side)','Lateral (next to closure)'], dataverseKey: 'cr56f_zipper' },
    ],
  },

  // ── Section 3: Sole & Heel ────────────────────────────────────────────────
  {
    key: 'sole', label: 'Sole & Heel Adaptions',
    labelNl: 'Zool- en Hakaanpassingen', labelFr: 'Adaptations de la semelle et du talon', labelDe: 'Anpassungen an Sohle u. Absatz',
    fields: [
      // Rocker + sub-options
      { key: 'rocker',       label: 'Rocker Sole Type',            labelNl: 'Type Afwikkeling',              type: 'image',  side: 'both', values: ['Normal Rocker','Advancing Rocker','Polyphase Rocker','Delaying Rocker','2-Phase Rocker'], dataverseKey: 'cr56f_2rockersoletypes' },
      { key: 'rocker_toes',  label: '↳ Toes',                      labelNl: '↳ Tenen',                      type: 'mm',     side: 'both', values: mm1to10, conditionalOn: 'rocker', dataverseKey: 'cr56f_2toes' },
      { key: 'rocker_joint', label: '↳ Joint',                     labelNl: '↳ Bal',                        type: 'mm',     side: 'both', values: mm1to10, conditionalOn: 'rocker', dataverseKey: 'cr56f_2joint' },
      { key: 'rocker_heel',  label: '↳ Heel',                      labelNl: '↳ Hiel',                       type: 'mm',     side: 'both', values: mm1to10, conditionalOn: 'rocker', dataverseKey: 'cr56f_2heel' },
      // Amendment PU/EVA Bumper
      { key: 'pu_bumper',    label: 'Amendment PU/EVA Bumper',     labelNl: 'Aanpassing PU/EVA Kuipzool',   type: 'toggle', side: 'both', dataverseKey: 'cr56f_6soleamendement2' },
      { key: 'pu_type',      label: '↳ PU/EVA Bumper type',        labelNl: '↳ PU/EVA type',                type: 'option', side: 'both', collapse: true, values: ['PU Black','PU White','EVA Black','EVA White'], conditionalOn: 'pu_bumper', dataverseKey: 'cr56f_6puevabumper' },
      // Amendment Sole
      { key: 'amend_sole',   label: 'Amendment Sole',              labelNl: 'Aanpassing Zool',              type: 'toggle', side: 'both', dataverseKey: 'cr56f_6soleamendement1' },
      { key: 'sole_type',    label: '↳ Sole',                      labelNl: '↳ Zool',                       type: 'option', side: 'both', collapse: true, conditionalOn: 'amend_sole', values: ['EVA Black','EVA Taupe','EVA Grey','EVA White','EVA Lightweight Black','EVA Lightweight Taupe','SPORTIVE Black','SPORTIVE Beige','SPORTIVE Grey','SPORTIVE White','EVA Lightweight Amber','EVA Lightweight White','Full Rubber Black','Full Rubber Amber','Full Rubber Blue','Full Rubber Pink','Full Rubber White','EVA Brown'], dataverseKey: 'cr56f_6evawedgecolour' },
      { key: 'spoiler',      label: '↳ Spoiler colour',            labelNl: '↳ Spoiler kleur',              type: 'option', side: 'both', collapse: true, conditionalOn: 'amend_sole', values: ['Black','Dark Brown','Light Grey','Dark Grey','Dark Blue','Red','Amber','Cobalt'], dataverseKey: 'cr56f_6spoiler' },
      { key: 'runner_sole',  label: '↳ Runner sole',               labelNl: '↳ Loopzool',                   type: 'option', side: 'both', collapse: true, conditionalOn: 'amend_sole', values: ['Piedro Runner Black','Piedro Runner Amber','Rubber Black','Rubber Amber','Fish Black','Fish Amber','Tire Black','Tire Amber','EVA Nora Astro Star Lightweight Black','EVA Nora Astro Star Lightweight Amber','EVA Lightweight Port Flex Black','EVA Lightweight Port Flex Amber','Lightweight Vibram Sole Black','Lightweight Vibram Sole Brown','Lightweight Sole Forli Uomo','Full Rubber Sole Montana Black','Full Rubber Sole Montana Brown','Nora Sole Plate Blue with Light Body Colour','Nora Sole Plate Black with Light Body Colour','Nora Sole Plate Black with Black Body Colour'], dataverseKey: 'cr56f_6runnersole' },
      // Float & Wedge with L/R sub-options
      { key: 'sole_float',   label: 'Sole Float',                  labelNl: 'Zool Schoring',                type: 'toggle', side: 'both', dataverseKey: 'cr56f_3solefloat' },
      { key: 'sf_medial',    label: '↳ Sole Float Medial (mm)',    labelNl: '↳ Mediaal',                    type: 'mm',     side: 'both', values: mm1to20, conditionalOn: 'sole_float', dataverseKey: 'cr56f_3sf_medial' },
      { key: 'sf_lateral',   label: '↳ Sole Float Lateral (mm)',   labelNl: '↳ Lateraal',                   type: 'mm',     side: 'both', values: mm1to20, conditionalOn: 'sole_float', dataverseKey: 'cr56f_3sf_lateral' },
      { key: 'heel_float',   label: 'Heel Float',                  labelNl: 'Hak Schoring',                 type: 'toggle', side: 'both', dataverseKey: 'cr56f_3heelfloat' },
      { key: 'hf_medial',    label: '↳ Heel Float Medial (mm)',    labelNl: '↳ Mediaal',                    type: 'mm',     side: 'both', values: mm1to20, conditionalOn: 'heel_float', dataverseKey: 'cr56f_3hf_medial' },
      { key: 'hf_lateral',   label: '↳ Heel Float Lateral (mm)',   labelNl: '↳ Lateraal',                   type: 'mm',     side: 'both', values: mm1to20, conditionalOn: 'heel_float', dataverseKey: 'cr56f_3hf_lateral' },
      { key: 'sole_wedge',   label: 'Sole Wedge',                  labelNl: 'Zool Wig',                     type: 'toggle', side: 'both', dataverseKey: 'cr56f_4solewedge' },
      { key: 'sw_medial',    label: '↳ Sole Wedge Medial (mm)',    labelNl: '↳ Mediaal',                    type: 'mm',     side: 'both', values: mm1to20, conditionalOn: 'sole_wedge', dataverseKey: 'cr56f_4sw_medial' },
      { key: 'sw_lateral',   label: '↳ Sole Wedge Lateral (mm)',   labelNl: '↳ Lateraal',                   type: 'mm',     side: 'both', values: mm1to20, conditionalOn: 'sole_wedge', dataverseKey: 'cr56f_4sw_lateral' },
      { key: 'heel_wedge',   label: 'Heel Wedge',                  labelNl: 'Hak Wig',                      type: 'toggle', side: 'both', dataverseKey: 'cr56f_4heelwedge' },
      { key: 'hw_medial',    label: '↳ Heel Wedge Medial (mm)',    labelNl: '↳ Mediaal',                    type: 'mm',     side: 'both', values: mm1to20, conditionalOn: 'heel_wedge', dataverseKey: 'cr56f_4hw_medial' },
      { key: 'hw_lateral',   label: '↳ Heel Wedge Lateral (mm)',   labelNl: '↳ Lateraal',                   type: 'mm',     side: 'both', values: mm1to20, conditionalOn: 'heel_wedge', dataverseKey: 'cr56f_4hw_lateral' },
      // Others
      { key: 'carb_insole',  label: 'Removable Carbon Insole',     labelNl: 'Losse Carbon Binnenzool',      type: 'toggle', side: 'both', dataverseKey: 'cr56f_6removablecarboninsole' },
      { key: 'carb_sole',    label: 'Full Carbon Sole Plate',      labelNl: 'Carbon Zool Verstijving',      type: 'toggle', side: 'both', dataverseKey: 'cr56f_6fullcarbonsoleplate' },
      { key: 'sach_heel',    label: 'Sach Heel',                   labelNl: 'Buffer hak',                   type: 'toggle', side: 'both', dataverseKey: 'cr56f_6sachheel' },
      { key: 'sep_soles',    label: 'Separate Soles',              labelNl: 'Loopzool los',                 type: 'toggle', side: 'both', dataverseKey: 'cr56f_6separatesoles' },
      { key: 'sep_sheets',   label: 'Separate Sheets',             labelNl: 'Loopplaat los',                type: 'toggle', side: 'both', dataverseKey: 'cr56f_6separatesheets' },
      { key: 'thomas_med',   label: 'Thomas Heel Medial',          labelNl: 'Vleugelhak Mediaal',           type: 'toggle', side: 'both', dataverseKey: 'cr56f_6thomasheelmedial' },
      { key: 'thomas_lat',   label: 'Thomas Heel Lateral',         labelNl: 'Vleugelhak Lateraal',          type: 'toggle', side: 'both', dataverseKey: 'cr56f_6thomasheellateral' },
    ],
  },

  // ── Section 4: Others ─────────────────────────────────────────────────────
  {
    key: 'others', label: 'Others',
    labelNl: 'Overige Aanpassingen', labelFr: 'Autres', labelDe: 'Sonstige',
    fields: [
      { key: 'welt_prot',   label: 'Welt Protector',              labelNl: 'Bescherming Aflapnaad',        type: 'toggle', side: 'both',   dataverseKey: 'cr56f_7weltprotector' },
      { key: 'prot_toe',    label: 'Protective Toe Cap',           labelNl: 'Kruipneus',                    type: 'toggle', side: 'both',   dataverseKey: 'cr56f_7protectivetoecap' },
      { key: 'xtra_laces',  label: 'Extra Pair of Laces',          labelNl: 'Extra paar veters',            type: 'toggle', side: 'global', dataverse: 'cr56f_7extrapairoflaces' },
      { key: 'no_logo',     label: 'No Piedro Logo',               labelNl: 'Geen Piedro Logo',             type: 'toggle', side: 'global', dataverse: 'cr56f_nopiedrologo' },
      { key: 'plastic_fit', label: 'Plastic Fitting Shoes',        labelNl: 'Plastic Passchoenen',          type: 'toggle', side: 'global', dataverse: 'cr56f_7plasticfittingshoes' },
      { key: 'urgent',      label: 'Urgent',                       labelNl: 'Spoed',                        type: 'toggle', side: 'global', dataverse: 'cr56f_7urgent' },
    ],
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build initial empty additions state from config */
export function emptyAdditions() {
  const out: Record<string, { l: unknown; r: unknown } | boolean | null> = {}
  for (const section of SECTIONS) {
    for (const field of section.fields) {
      if (field.side === 'global') {
        out[field.key] = false
      } else if (field.type === 'toggle') {
        out[field.key] = { l: false, r: false }
      } else if (field.type === 'text') {
        out[field.key] = { l: '', r: '' }
      } else {
        out[field.key] = { l: null, r: null }
      }
    }
  }
  return out
}

/** Count filled fields in a section (for the accordion badge) */
export function countFilled(
  additions: Record<string, unknown>,
  sectionKey: string,
): number {
  const section = SECTIONS.find(s => s.key === sectionKey)
  if (!section) return 0
  let count = 0
  for (const field of section.fields) {
    const val = additions[field.key]
    if (val == null) continue
    if (field.side === 'global') { if (val === true) count++; continue }
    const sv = val as { l: unknown; r: unknown }
    if (sv?.l != null && sv.l !== false && sv.l !== '') count++
    if (sv?.r != null && sv.r !== false && sv.r !== '') count++
  }
  return count
}

/** Filter fields that are excluded for this product (adds_exclude string from product) */
export function filterExcluded(fields: AdditionField[], addsExclude: string): AdditionField[] {
  if (!addsExclude) return fields
  return fields.filter(f => {
    if (!f.dataverseKey && !f.dataverse) return true
    const key = f.dataverseKey ?? f.dataverse ?? ''
    return !addsExclude.includes(`#${key}`)
  })
}
