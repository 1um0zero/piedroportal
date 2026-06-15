/**
 * Normalise products.color_name into a canonical English base + per-locale
 * color_name_i18n {nl,fr,de}. KIDS names arrive from Dataverse in Dutch
 * ("Roze Suède & Roze Leer Combi"); adult names are already English. The portal
 * renders the EN base for the en locale and color_name_i18n[locale] otherwise
 * (see ProductCard / ProductDetail), so non-translated names fall back to the
 * raw value — which is why kids colours stayed Dutch in English.
 *
 * Strategy: a colour/material word dictionary (en + nl/fr/de). Each name is split
 * on separators ( & , / ), each segment tokenised greedily against the dictionary
 * (longest phrase first), and recomposed into all four languages. English tokens
 * map to themselves, so the pass is idempotent for adult names.
 *
 * Run:  node scripts/translate-colour-names.mjs           (dry-run + coverage report)
 *       node scripts/translate-colour-names.mjs --apply   (write to Supabase)
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const APPLY = process.argv.includes('--apply')
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// en token (canonical) -> { nl, fr, de }. Keys are the *source* spellings we may
// encounter (Dutch or English); the `en` field is the canonical English output.
const D = (en, nl, fr, de) => ({ en, nl, fr, de })
const WORDS = {
  // multi-word phrases first (longest-match)
  'multi colour': D('Multi Colour', 'Multikleur', 'Multicolore', 'Mehrfarbig'),
  'off-white':    D('Off-White', 'Gebroken Wit', 'Blanc Cassé', 'Gebrochenes Weiß'),
  'off white':    D('Off-White', 'Gebroken Wit', 'Blanc Cassé', 'Gebrochenes Weiß'),
  'cobalt blue':  D('Cobalt Blue', 'Kobaltblauw', 'Bleu Cobalt', 'Kobaltblau'),
  'light blue':   D('Light Blue', 'Lichtblauw', 'Bleu Clair', 'Hellblau'),
  'light green':  D('Light Green', 'Lichtgroen', 'Vert Clair', 'Hellgrün'),
  'light grey':   D('Light Grey', 'Lichtgrijs', 'Gris Clair', 'Hellgrau'),
  'dark blue':    D('Dark Blue', 'Donkerblauw', 'Bleu Foncé', 'Dunkelblau'),
  'dark brown':   D('Dark Brown', 'Donkerbruin', 'Marron Foncé', 'Dunkelbraun'),
  'soft pink':    D('Soft Pink', 'Zacht Roze', 'Rose Doux', 'Zartrosa'),
  'baby pink':    D('Baby Pink', 'Babyroze', 'Rose Bébé', 'Babyrosa'),
  // colours
  black: D('Black', 'Zwart', 'Noir', 'Schwarz'), zwart: D('Black', 'Zwart', 'Noir', 'Schwarz'),
  white: D('White', 'Wit', 'Blanc', 'Weiß'), wit: D('White', 'Wit', 'Blanc', 'Weiß'),
  blue: D('Blue', 'Blauw', 'Bleu', 'Blau'), blauw: D('Blue', 'Blauw', 'Bleu', 'Blau'),
  bue: D('Blue', 'Blauw', 'Bleu', 'Blau'), // typo seen in source
  donkerblauw: D('Dark Blue', 'Donkerblauw', 'Bleu Foncé', 'Dunkelblau'),
  brown: D('Brown', 'Bruin', 'Marron', 'Braun'), bruin: D('Brown', 'Bruin', 'Marron', 'Braun'),
  donkerbruin: D('Dark Brown', 'Donkerbruin', 'Marron Foncé', 'Dunkelbraun'),
  grey: D('Grey', 'Grijs', 'Gris', 'Grau'), grijs: D('Grey', 'Grijs', 'Gris', 'Grau'),
  lichtgrijs: D('Light Grey', 'Lichtgrijs', 'Gris Clair', 'Hellgrau'),
  green: D('Green', 'Groen', 'Vert', 'Grün'), groen: D('Green', 'Groen', 'Vert', 'Grün'),
  red: D('Red', 'Rood', 'Rouge', 'Rot'), rood: D('Red', 'Rood', 'Rouge', 'Rot'),
  pink: D('Pink', 'Roze', 'Rose', 'Rosa'), roze: D('Pink', 'Roze', 'Rose', 'Rosa'),
  rose: D('Rose', 'Roze', 'Rose', 'Rosé'),
  purple: D('Purple', 'Paars', 'Violet', 'Violett'), paars: D('Purple', 'Paars', 'Violet', 'Violett'),
  yellow: D('Yellow', 'Geel', 'Jaune', 'Gelb'), geel: D('Yellow', 'Geel', 'Jaune', 'Gelb'),
  orange: D('Orange', 'Oranje', 'Orange', 'Orange'), oranje: D('Orange', 'Oranje', 'Orange', 'Orange'),
  gold: D('Gold', 'Goud', 'Or', 'Gold'), goud: D('Gold', 'Goud', 'Or', 'Gold'),
  ochre: D('Ochre', 'Oker', 'Ocre', 'Ocker'), oker: D('Ochre', 'Oker', 'Ocre', 'Ocker'),
  olive: D('Olive', 'Olijf', 'Olive', 'Oliv'), olijf: D('Olive', 'Olijf', 'Olive', 'Oliv'),
  khaki: D('Khaki', 'Kaki', 'Kaki', 'Khaki'), kaki: D('Khaki', 'Kaki', 'Kaki', 'Khaki'),
  cobalt: D('Cobalt', 'Kobalt', 'Cobalt', 'Kobalt'), kobalt: D('Cobalt', 'Kobalt', 'Cobalt', 'Kobalt'),
  cobalti: D('Cobalt', 'Kobalt', 'Cobalt', 'Kobalt'),
  turquoise: D('Turquoise', 'Turquoise', 'Turquoise', 'Türkis'),
  beige: D('Beige', 'Beige', 'Beige', 'Beige'),
  taupe: D('Taupe', 'Taupe', 'Taupe', 'Taupe'),
  cognac: D('Cognac', 'Cognac', 'Cognac', 'Cognac'),
  bordeaux: D('Bordeaux', 'Bordeaux', 'Bordeaux', 'Bordeaux'),
  fuchsia: D('Fuchsia', 'Fuchsia', 'Fuchsia', 'Fuchsie'),
  lila: D('Lila', 'Lila', 'Lilas', 'Lila'),
  mint: D('Mint', 'Mint', 'Menthe', 'Minze'),
  navy: D('Navy', 'Marineblauw', 'Marine', 'Marineblau'),
  camel: D('Camel', 'Camel', 'Camel', 'Camel'),
  tan: D('Tan', 'Tan', 'Fauve', 'Hellbraun'),
  champagne: D('Champagne', 'Champagne', 'Champagne', 'Champagner'),
  army: D('Army', 'Army', 'Army', 'Army'),
  anthracite: D('Anthracite', 'Antraciet', 'Anthracite', 'Anthrazit'),
  antraciet: D('Anthracite', 'Antraciet', 'Anthracite', 'Anthrazit'),
  bronze: D('Bronze', 'Brons', 'Bronze', 'Bronze'),
  copper: D('Copper', 'Koper', 'Cuivre', 'Kupfer'),
  silver: D('Silver', 'Zilver', 'Argent', 'Silber'),
  petrol: D('Petrol', 'Petrol', 'Pétrole', 'Petrol'),
  sand: D('Sand', 'Zand', 'Sable', 'Sand'),
  // materials / finishes
  leather: D('Leather', 'Leer', 'Cuir', 'Leder'), leer: D('Leather', 'Leer', 'Cuir', 'Leder'),
  suede: D('Suede', 'Suède', 'Daim', 'Wildleder'), 'suède': D('Suede', 'Suède', 'Daim', 'Wildleder'),
  nubuck: D('Nubuck', 'Nubuck', 'Nubuck', 'Nubuk'),
  mesh: D('Mesh', 'Mesh', 'Mesh', 'Mesh'),
  patent: D('Patent', 'Lak', 'Vernis', 'Lack'), lak: D('Patent', 'Lak', 'Vernis', 'Lack'),
  fantasy: D('Fantasy', 'Fantasie', 'Fantaisie', 'Fantasie'),
  fantasie: D('Fantasy', 'Fantasie', 'Fantaisie', 'Fantasie'),
  pony: D('Pony', 'Pony', 'Poulain', 'Pony'), ponyhair: D('Pony', 'Pony', 'Poulain', 'Pony'),
  metallic: D('Metallic', 'Metallic', 'Métallisé', 'Metallic'),
  metalize: D('Metallic', 'Metallic', 'Métallisé', 'Metallic'),
  oiled: D('Oiled', 'Geolied', 'Huilé', 'Geölt'), geolied: D('Oiled', 'Geolied', 'Huilé', 'Geölt'),
  reptile: D('Reptile', 'Reptiel', 'Reptile', 'Reptil'),
  reptiel: D('Reptile', 'Reptiel', 'Reptile', 'Reptil'),
  croco: D('Croco', 'Croco', 'Croco', 'Kroko'),
  snake: D('Snake', 'Slang', 'Serpent', 'Schlange'),
  print: D('Print', 'Print', 'Imprimé', 'Print'),
  rainbow: D('Rainbow', 'Regenboog', 'Arc-en-ciel', 'Regenbogen'),
  regenboog: D('Rainbow', 'Regenboog', 'Arc-en-ciel', 'Regenbogen'),
  flower: D('Flower', 'Bloem', 'Fleur', 'Blume'),
  jeans: D('Jeans', 'Jeans', 'Jean', 'Jeans'),
  nappa: D('Nappa', 'Nappa', 'Nappa', 'Nappa'),
  lycra: D('Lycra', 'Lycra', 'Lycra', 'Lycra'),
  stretch: D('Stretch', 'Stretch', 'Stretch', 'Stretch'),
  combi: D('Combi', 'Combi', 'Combi', 'Combi'),
  multi: D('Multi', 'Multi', 'Multi', 'Multi'),
  // descriptors
  dark: D('Dark', 'Donker', 'Foncé', 'Dunkel'),
  light: D('Light', 'Licht', 'Clair', 'Hell'),
  soft: D('Soft', 'Zacht', 'Doux', 'Soft'),
  baby: D('Baby', 'Baby', 'Bébé', 'Baby'),
  city: D('City', 'City', 'City', 'City'),
}

// normalise broken encoding / typos before tokenising
function normalize(s) {
  return s
    .replace(/�(?=[A-Z])/g, ' ') // Blue�Nubuck -> Blue Nubuck (lost separator)
    .replace(/�/g, 'è')          // Su�de -> Suède (replacement char)
    .replace(/Suvde/gi, 'Suède')
    .replace(/Fantastie/gi, 'Fantasie')
    .replace(/\s+/g, ' ')
    .trim()
}

const keys = Object.keys(WORDS).sort((a, b) => b.length - a.length)
const cap = w => w.charAt(0).toUpperCase() + w.slice(1)

// tokenise one segment (no separators) greedily; returns {en,nl,fr,de,missing[]}
function composeSegment(seg) {
  let rem = seg.trim()
  const out = { en: [], nl: [], fr: [], de: [] }
  const missing = []
  while (rem.length) {
    const low = rem.toLowerCase()
    const k = keys.find(k => low === k || low.startsWith(k + ' '))
    if (k) {
      const w = WORDS[k]
      out.en.push(w.en); out.nl.push(w.nl); out.fr.push(w.fr); out.de.push(w.de)
      rem = rem.slice(k.length).trim()
    } else {
      const sp = rem.indexOf(' ')
      const word = sp < 0 ? rem : rem.slice(0, sp)
      missing.push(word)
      const c = cap(word)
      out.en.push(c); out.nl.push(c); out.fr.push(c); out.de.push(c)
      rem = sp < 0 ? '' : rem.slice(sp).trim()
    }
  }
  return { en: out.en.join(' '), nl: out.nl.join(' '), fr: out.fr.join(' '), de: out.de.join(' '), missing }
}

// compose a full name, preserving & , / separators
function compose(name) {
  const norm = normalize(name)
  const parts = norm.split(/(\s*&\s*|\s*,\s*|\s*\/\s*)/)
  const res = { en: '', nl: '', fr: '', de: '' }
  const missing = []
  for (const part of parts) {
    if (/^\s*&\s*$/.test(part)) { for (const l of ['en','nl','fr','de']) res[l] += ' & '; continue }
    if (/^\s*,\s*$/.test(part)) { for (const l of ['en','nl','fr','de']) res[l] += ', '; continue }
    if (/^\s*\/\s*$/.test(part)) { for (const l of ['en','nl','fr','de']) res[l] += '/'; continue }
    if (!part.trim()) continue
    const c = composeSegment(part)
    res.en += c.en; res.nl += c.nl; res.fr += c.fr; res.de += c.de
    missing.push(...c.missing)
  }
  return { ...res, missing }
}

const main = async () => {
  let all = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('products')
      .select('id,colour_id,section,color_name,color_name_i18n').not('color_name', 'is', null).range(from, from + 999)
    if (error) throw error
    if (!data.length) break
    all = all.concat(data); if (data.length < 1000) break
  }

  const missingCount = new Map()
  const updates = []
  for (const p of all) {
    if (!p.color_name?.trim()) continue
    const c = compose(p.color_name)
    for (const m of c.missing) missingCount.set(m, (missingCount.get(m) || 0) + 1)
    const i18n = { nl: c.nl, fr: c.fr, de: c.de }
    const before = JSON.stringify({ n: p.color_name, i: p.color_name_i18n })
    const after = JSON.stringify({ n: c.en, i: i18n })
    if (before !== after) updates.push({ id: p.id, colour_id: p.colour_id, color_name: c.en, color_name_i18n: i18n })
  }

  console.log(`Products: ${all.length} | needing update: ${updates.length}`)
  const miss = [...missingCount.entries()].sort((a, b) => b[1] - a[1])
  console.log(`\nUncovered tokens (${miss.length}) — pass through unchanged:`)
  console.log(miss.map(([w, n]) => `${w}×${n}`).join('  ') || 'NONE ✓')
  console.log('\nSample translations:')
  for (const u of updates.slice(0, 12)) console.log(`  ${u.colour_id}  EN=${JSON.stringify(u.color_name)}  NL=${JSON.stringify(u.color_name_i18n.nl)}`)

  if (!APPLY) { console.log('\n(dry-run — pass --apply to write)'); return }

  let done = 0
  for (const u of updates) {
    const { error } = await sb.from('products')
      .update({ color_name: u.color_name, color_name_i18n: u.color_name_i18n }).eq('id', u.id)
    if (error) { console.log('ERR', u.colour_id, error.message); continue }
    if (++done % 100 === 0) console.log(`  updated ${done}/${updates.length}`)
  }
  console.log(`\n✅ applied ${done} updates`)
}
main().catch(e => { console.error('❌', e); process.exit(1) })
