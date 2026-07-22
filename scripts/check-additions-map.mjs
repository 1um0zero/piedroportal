#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Guard for the "additions change → prepare everything for dsv" rule.
//
// Every OSB addition field (src/components/order/additions-config.ts) MUST have a
// row in docs/erp-additions-map.csv so the A-Shell side (dsv) can map it. This
// script fails if a config key has no CSV row — i.e. someone added/renamed an
// addition without preparing the dsv hand-off. Wired into .githooks/pre-commit.
//
// See docs/erp/ADDITIONS-FOR-DSV.md.
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(fileURLToPath(import.meta.url), '..', '..')
const CONFIG = path.join(ROOT, 'src/components/order/additions-config.ts')
const CSV = path.join(ROOT, 'docs/erp-additions-map.csv')

// OSB config uses object literals `{ key: 'xxx', … }` — only the SECTIONS array.
// Grab every key: '…' that sits inside the exported SECTIONS array.
const src = fs.readFileSync(CONFIG, 'utf8')
const start = src.indexOf('export const SECTIONS')
const body = start >= 0 ? src.slice(start) : src
// CSV rows: portal_section;portal_key;… — only the OSB section rows carry a
// portal_section (additions|upper|sole|others); SO-ASHELL-only rows have none.
const OSB_SECTIONS = new Set(['additions', 'upper', 'sole', 'others'])

// Every `key: '…'` inside SECTIONS — but drop the section-level keys themselves
// (`{ key: 'upper', fields: […] }`), which are not addition fields.
const configKeys = [...body.matchAll(/\bkey:\s*'([^']+)'/g)]
  .map(m => m[1])
  .filter(k => !OSB_SECTIONS.has(k))
const uniqueKeys = [...new Set(configKeys)]
const csvLines = fs.readFileSync(CSV, 'utf8').split(/\r?\n/).slice(1)
const csvKeys = new Set()
for (const line of csvLines) {
  if (!line.trim()) continue
  const [section, key] = line.split(';')
  if (OSB_SECTIONS.has(section?.trim())) csvKeys.add(key?.trim())
}

const missing = uniqueKeys.filter(k => !csvKeys.has(k))

if (missing.length) {
  console.error('✖ additions-map guard: these OSB addition keys have NO row in docs/erp-additions-map.csv:')
  for (const k of missing) console.error(`    • ${k}`)
  console.error('\n  → Add a row (A-Shell columns empty + TODO-DSV) and a CHANGELOG entry in')
  console.error('    docs/erp/ADDITIONS-FOR-DSV.md, so the dsv side can map it. See that file for the rule.')
  process.exit(1)
}

console.log(`✓ additions-map guard: all ${uniqueKeys.length} OSB addition keys are mapped for dsv.`)
