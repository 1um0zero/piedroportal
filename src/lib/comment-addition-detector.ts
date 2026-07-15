/**
 * Comment → additions detector.
 *
 * Clients sometimes describe an orthopedic amendment in the free-text order
 * comment (e.g. "please add a heel wedge") instead of ticking the dedicated
 * field. This module scans the comment for terms that map to a real additions
 * field so the form can nudge the client to use the structured field instead —
 * which keeps the order machine-readable for the VSI import.
 *
 * Matching is keyword-based (no LLM): a curated, multilingual synonym map per
 * field (the clinical terms clients actually type across EN/NL/FR/DE) plus any
 * extra terms the caller supplies (e.g. the currently-localized field label).
 * Only EMPTY + visible fields are suggested (the caller decides via `isCandidate`),
 * and every suggestion is dismissible, so a false positive costs nothing.
 */
import { SECTIONS } from '@/components/order/additions-config'

export type CommentSuggestion = {
  fieldKey: string
  sectionKey: string
  matched: string // the phrase in the comment that triggered the suggestion
}

/**
 * Curated clinical synonyms per field key, multilingual (EN/NL/FR/DE + common
 * shorthands). Terms are distinctive on purpose — generic option words like
 * "soft"/"black"/"lace" are deliberately excluded to avoid noise. Terms shorter
 * than 4 chars are ignored at match time. Extend freely: add the words clients
 * actually write, in every language they write them.
 */
export const SYNONYMS: Record<string, string[]> = {
  // ── Additions ──────────────────────────────────────────────────────────────
  lat_joint_w:  ['lateral joint', 'laterale gewricht', 'gewricht lateraal'],
  med_joint_w:  ['medial joint', 'mediale gewricht', 'gewricht mediaal'],
  lat_heel_w:   ['lateral heel width', 'laterale hiel'],
  med_heel_w:   ['medial heel width', 'mediale hiel'],
  hammer_toe:   ['hammer toe', 'hammertoe', 'hamerteen', 'orteil en marteau', 'hammerzehe'],
  toe_box:      ['toe box', 'teenbox', 'boite a orteils'],
  bunionette:   ['bunionette', 'digiti quinti', 'quintus varus'],
  hallux_v:     ['hallux valgus', 'hallux', 'bunion', 'knobbel', 'oignon'],
  depth_fore:   ['depth forefoot', 'extra diepte voorvoet', 'diepte voorvoet'],
  depth_toe:    ['depth toe', 'diepte teen', 'diepte hiel'],
  xw_cone:      ['extra width cone', 'extra breedte conus', 'conus'],
  str_heel:     ['straighten heel', 'hielclip recht', 'rechte hiel'],
  heel_depth:   ['heel depth', 'hieldiepte'],
  haglund:      ['haglund', 'exostose', 'exostosis'],
  xs_med_ank:   ['medial ankle', 'mediale enkel', 'malleolus', 'enkel ruimte', 'ruimte enkel'],
  xs_lat_ank:   ['lateral ankle', 'laterale enkel'],

  // ── Upper ──────────────────────────────────────────────────────────────────
  lining:       ['lining', 'voering', 'doublure', 'futter', 'bont', 'fourrure', 'sympatex', 'diabetic', 'microfiber', 'synthetic fur', 'real fur'],
  cl_laces:     ['eyelet', 'hooks', 'blind eyelet', 'boa closure', 'boa sluiting', 'd-ring', 'd ring'],
  cl_velcro:    ['velcro', 'klittenband', 'klitteband', 'scratch', 'lap-over', 'single hand velcro'],
  stiff_hard:   ['stiffener', 'contrefort', 'versteviging', 'verstevigde hielkap'],
  toe_puffs:    ['toe puff', 'neusversteviging', 'renfort bout'],
  toe_puffs_rim:['toe puff rim', 'neus rand'],
  str_leather:  ['stretch leather', 'stretch leer', 'rekleer', 'rekken leer', 'uitrekken', 'cuir extensible', 'dehnen'],
  instep_front: ['instep', 'wreef', 'inschot', 'cou-de-pied', 'spann', 'more to the front'],
  colour_mod:   ['colour modification', 'color modification', 'kleur aanpassing', 'kleurwijziging', 'modification couleur'],
  pad_tongue:   ['padding tongue', 'tongue padding', 'vulling tong', 'gevoerde tong', 'langue rembourree'],
  zipper:       ['zipper', 'rits', 'ritssluiting', 'fermeture eclair', 'reissverschluss'],

  // ── Sole & Heel ──────────────────────────────────────────────────────────────
  rocker:       ['rocker', 'afwikkeling', 'afwikkelzool', 'abrollung', 'roll sole'],
  pu_bumper:    ['pu bumper', 'eva bumper', 'bumper'],
  amend_sole:   ['sole amendment', 'zoolaanpassing', 'zool aanpassing', 'amendement semelle'],
  sole_type:    ['eva sole', 'eva zool', 'rubber sole', 'rubber zool', 'sportive sole'],
  runner_sole:  ['runner sole', 'vibram', 'nora', 'piedro runner', 'montana', 'forli'],
  sole_float:   ['sole float', 'zoolzweving', 'zool zweving', 'zool float'],
  heel_float:   ['heel float', 'hielzweving', 'hiel zweving'],
  sole_wedge:   ['sole wedge', 'zoolwig', 'zool wig', 'coin de semelle'],
  heel_wedge:   ['heel wedge', 'hakwig', 'hak wig', 'hielwig', 'coin talon', 'fersenkeil'],
  heel_round:   ['heel rounding', 'hak afronding', 'hakafronding', 'afgeronde hak'],
  gen_raise:    ['general raise', 'generale verhoging', 'algemene verhoging', 'verhoging', 'rehausse', 'erhohung', 'schoenverhoging'],
  gen_raise_add:['additional raise', 'additionele verhoging'],
  carb_insole:  ['carbon insole', 'carbon inlegzool', 'koolstof inlegzool', 'removable carbon'],
  carb_sole:    ['carbon sole', 'full carbon', 'koolstof zool', 'volledige carbon'],
  sach_heel:    ['sach heel', 'sach hiel', 'sach'],
  sep_soles:    ['separate soles', 'losse zolen', 'aparte zolen'],
  sep_sheets:   ['separate sheets', 'losse platen'],
  thomas_med:   ['thomas heel medial', 'thomas hak mediaal', 'medial thomas'],
  thomas_lat:   ['thomas heel lateral', 'thomas hak lateraal', 'lateral thomas'],

  // ── Others ──────────────────────────────────────────────────────────────────
  welt_prot:    ['welt protector', 'randbescherming', 'rand bescherming'],
  prot_toe:     ['protective toe', 'protective toe cap', 'beschermkap', 'beschermende neus', 'stalen neus'],
  xtra_laces:   ['extra laces', 'extra veters', 'extra pair of laces', 'paire de lacets', 'reserve veters'],
  no_logo:      ['no logo', 'geen logo', 'zonder logo', 'sans logo', 'no piedro logo', 'ohne logo'],
  plastic_fit:  ['plastic fitting', 'passchoen', 'fitting shoe'],
  urgent:       ['urgent', 'spoed', 'dringend', 'eilig', 'met spoed'],
}

/** Normalize to lowercase, accent-free, single-spaced, wrapped in spaces for
 *  whole-word boundary matching via substring `includes`. */
function normalize(s: string): string {
  const n = s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return ` ${n} `
}

// Field key → its section key (built once).
const SECTION_OF: Record<string, string> = (() => {
  const m: Record<string, string> = {}
  for (const section of SECTIONS) for (const field of section.fields) m[field.key] = section.key
  return m
})()

/**
 * Detect additions mentioned in a free-text comment.
 *
 * @param comment      the raw comment text
 * @param isCandidate  predicate: only fields for which this returns true are
 *                     considered (caller passes empty + visible fields)
 * @param extraTerms   optional per-field extra match terms (e.g. localized labels)
 */
export function detectAdditionsInComment(
  comment: string,
  isCandidate: (fieldKey: string) => boolean,
  extraTerms?: Record<string, string[]>,
): CommentSuggestion[] {
  const text = comment.trim()
  if (text.length < 4) return []
  const hay = normalize(text)
  const out: CommentSuggestion[] = []

  const keys = new Set<string>([...Object.keys(SYNONYMS), ...Object.keys(extraTerms ?? {})])
  for (const fieldKey of keys) {
    if (!SECTION_OF[fieldKey]) continue
    if (!isCandidate(fieldKey)) continue
    const terms = [...(SYNONYMS[fieldKey] ?? []), ...(extraTerms?.[fieldKey] ?? [])]
    let matched: string | null = null
    for (const term of terms) {
      const t = normalize(term).trim()
      if (t.length < 4) continue
      if (hay.includes(` ${t} `)) { matched = term; break }
    }
    if (matched) out.push({ fieldKey, sectionKey: SECTION_OF[fieldKey], matched })
  }
  return out
}
