/**
 * Seed generator for the colour-word dictionary.
 * - Builds the en/nl/fr/de word dictionary.
 * - Verifies it composes every distinct color_basic with no missing words.
 * - Emits supabase-colour-words.sql (adds translations.manual + seeds colour_word rows).
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

// English word/phrase → { nl, fr, de }
const WORDS = {
  'Multi Colour': { nl: 'Multikleur', fr: 'Multicolore', de: 'Mehrfarbig' },
  'Multi colour': { nl: 'Multikleur', fr: 'Multicolore', de: 'Mehrfarbig' },
  'Off-White':    { nl: 'Gebroken Wit', fr: 'Blanc Cassé', de: 'Gebrochenes Weiß' },
  'Off White':    { nl: 'Gebroken Wit', fr: 'Blanc Cassé', de: 'Gebrochenes Weiß' },
  'Cobalt Blue':  { nl: 'Kobaltblauw', fr: 'Bleu Cobalt', de: 'Kobaltblau' },
  'Light Blue':   { nl: 'Lichtblauw', fr: 'Bleu Clair', de: 'Hellblau' },
  'Light Green':  { nl: 'Lichtgroen', fr: 'Vert Clair', de: 'Hellgrün' },
  'Dark Brown':   { nl: 'Donkerbruin', fr: 'Marron Foncé', de: 'Dunkelbraun' },
  Beige:      { nl: 'Beige', fr: 'Beige', de: 'Beige' },
  Black:      { nl: 'Zwart', fr: 'Noir', de: 'Schwarz' },
  Blue:       { nl: 'Blauw', fr: 'Bleu', de: 'Blau' },
  Bordeaux:   { nl: 'Bordeaux', fr: 'Bordeaux', de: 'Bordeaux' },
  Bronze:     { nl: 'Brons', fr: 'Bronze', de: 'Bronze' },
  Brown:      { nl: 'Bruin', fr: 'Marron', de: 'Braun' },
  Cognac:     { nl: 'Cognac', fr: 'Cognac', de: 'Cognac' },
  Fuchsia:    { nl: 'Fuchsia', fr: 'Fuchsia', de: 'Fuchsie' },
  Green:      { nl: 'Groen', fr: 'Vert', de: 'Grün' },
  Grey:       { nl: 'Grijs', fr: 'Gris', de: 'Grau' },
  Kaki:       { nl: 'Kaki', fr: 'Kaki', de: 'Khaki' },
  Lila:       { nl: 'Lila', fr: 'Lilas', de: 'Lila' },
  Navy:       { nl: 'Marineblauw', fr: 'Marine', de: 'Marineblau' },
  Olive:      { nl: 'Olijf', fr: 'Olive', de: 'Oliv' },
  Orange:     { nl: 'Oranje', fr: 'Orange', de: 'Orange' },
  Pink:       { nl: 'Roze', fr: 'Rose', de: 'Rosa' },
  Purple:     { nl: 'Paars', fr: 'Violet', de: 'Violett' },
  Red:        { nl: 'Rood', fr: 'Rouge', de: 'Rot' },
  Silver:     { nl: 'Zilver', fr: 'Argent', de: 'Silber' },
  Taupe:      { nl: 'Taupe', fr: 'Taupe', de: 'Taupe' },
  White:      { nl: 'Wit', fr: 'Blanc', de: 'Weiß' },
  Yellow:     { nl: 'Geel', fr: 'Jaune', de: 'Gelb' },
  Anthracite: { nl: 'Antraciet', fr: 'Anthracite', de: 'Anthrazit' },
}

// inline composeColour (mirror of src/lib/colour-compose.ts) for verification
function compose(value, dict) {
  const keys = Object.keys(dict).sort((a, b) => b.length - a.length)
  const missing = []
  const parts = value.split(',').map(s => s.trim()).filter(Boolean)
  const out = parts.map(part => {
    let rem = part, toks = []
    while (rem.length) {
      const k = keys.find(k => rem === k || rem.startsWith(k + ' '))
      if (k) { toks.push(dict[k]); rem = rem.slice(k.length).trim() }
      else { const sp = rem.indexOf(' '); const w = sp < 0 ? rem : rem.slice(0, sp); missing.push(w); toks.push(w); rem = sp < 0 ? '' : rem.slice(sp).trim() }
    }
    return toks.join(' ')
  })
  return { text: out.join(', '), missing }
}

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const BASE = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY

const main = async () => {
  const r = await fetch(BASE + '/rest/v1/products?select=color_basic&color_basic=not.is.null', {
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, Range: '0-99999' },
  })
  const colours = [...new Set((await r.json()).map(p => p.color_basic).filter(Boolean))].sort()

  const nlDict = Object.fromEntries(Object.entries(WORDS).map(([k, v]) => [k, v.nl]))
  const allMissing = new Set()
  for (const c of colours) compose(c, nlDict).missing.forEach(m => allMissing.add(m))
  console.error(`Distinct colours: ${colours.length} | uncovered words: ${[...allMissing].join(', ') || 'NONE ✓'}`)

  const q = s => "'" + s.replace(/'/g, "''") + "'"
  const rows = Object.entries(WORDS).map(([en, t]) =>
    `  (${q('word:' + en)}, ${q(en)}, ${q(t.nl)}, ${q(t.fr)}, ${q(t.de)}, 'colour_word')`)

  const sql = `-- ============================================================================
-- Colour-word dictionary + manual-override flag
-- Run in the Supabase SQL Editor (once). Then use /admin/translations → "Colour
-- words" + "Recompose" to (re)generate the basic-colour translations.
-- ============================================================================

ALTER TABLE translations ADD COLUMN IF NOT EXISTS manual boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN translations.manual IS 'When true, the value was edited by hand and is never overwritten by auto-composition.';

INSERT INTO translations (key, en, nl, fr, de, category) VALUES
${rows.join(',\n')}
ON CONFLICT (key) DO UPDATE
  SET en = EXCLUDED.en, nl = EXCLUDED.nl, fr = EXCLUDED.fr, de = EXCLUDED.de, category = EXCLUDED.category;
`
  writeFileSync(resolve(process.cwd(), 'supabase-colour-words.sql'), sql)
  console.error(`Wrote supabase-colour-words.sql (${rows.length} word rows)`)
}
main().catch(e => { console.error('❌', e.message); process.exit(1) })
