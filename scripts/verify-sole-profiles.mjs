/**
 * Safety verification of the sole hierarchy BEFORE wiring it into the live form.
 *  (a) every allowed value exists in additions-config (no typo silently drops an option);
 *  (b) human-readable "what each group will SHOW" report, to audit fidelity to Anabela.
 * Read-only. Writes docs/sole-hierarchy/VERIFICACAO.md.
 */
import { readFileSync, writeFileSync } from 'fs'
const data = readFileSync('src/components/order/sole-profile-data.ts', 'utf8')
const PROFILE_OPTIONS = JSON.parse(data.match(/PROFILE_OPTIONS[^=]*=\s*(\{[\s\S]*?\n\})/)[1])
const PROFILE_STYLES = JSON.parse(data.match(/PROFILE_STYLES[^=]*=\s*(\{[\s\S]*?\n\})/)[1])
const LABELS = JSON.parse(data.match(/SOLE_GROUP_LABELS[^=]*=\s*(\{[\s\S]*?\n\})/)[1])

const CFG = {
  pu_type: ['PU Black','PU White','EVA Black','EVA White'],
  sole_type: ['EVA Black','EVA Taupe','EVA Grey','EVA White','EVA Lightweight Black','EVA Lightweight Taupe','Sportive Black','Sportive Beige','Sportive Grey','Sportive White','EVA Lightweight Amber','EVA Lightweight Off-White','Full Rubber Black','Full Rubber Amber','Full Rubber Blue','Full Rubber Pink','Full Rubber White','EVA Brown'],
  runner_sole: ['Piedro Runner Black','Piedro Runner Amber','Rubber Black','Rubber Amber','Fish Black','Fish Amber','Tire Black','Tire Amber','EVA Nora Astro Star Lightweight Black','EVA Nora Astro Star Lightweight Amber','EVA Lightweight Port Flex Black','EVA Lightweight Port Flex Amber','Lightweight Vibram Sole Black','Lightweight Vibram Sole Brown','Lightweight Sole Forli Uomo','Full Rubber Sole Montana Black','Full Rubber Sole Montana Brown','Nora Sole Plate Blue with Light Body Colour','Nora Sole Plate Black with Light Body Colour','Nora Sole Plate Black with Black Body Colour'],
}
const FLABEL = { pu_type: 'PU/EVA Bumper', sole_type: 'Sole', spoiler: 'Spoiler', runner_sole: 'Sole Sheet/Plate' }

let errors = 0
const out = ['# Verificação da hierarquia de solas (o que cada grupo MOSTRA)\n',
  'Gerado de sole-profile-data.ts. `TODOS` = campo mostrado sem restrição; campo ausente = ESCONDIDO.',
  'spoiler está escondido em todos os grupos (o Zolen não o usa).\n']

for (const [key, opt] of Object.entries(PROFILE_OPTIONS)) {
  const styles = PROFILE_STYLES[key] || []
  out.push(`\n## [${key}] ${LABELS[key]} — ${styles.length} modelos`)
  const shown = []
  for (const f of ['pu_type', 'sole_type', 'runner_sole']) {
    const v = opt[f]
    if (v === undefined) continue // hidden
    if (v === '*') { shown.push(`- **${FLABEL[f]}**: TODOS`); continue }
    // validate each value exists in config
    const bad = v.filter(x => !CFG[f].includes(x))
    bad.forEach(b => { errors++; console.error(`✗ ${key}.${f}: valor inexistente na config → "${b}"`) })
    shown.push(`- **${FLABEL[f]}**: ${v.join(', ')}${bad.length ? '  ⚠ INVÁLIDO: ' + bad.join(',') : ''}`)
  }
  if (!shown.length) shown.push('- _(sem ajustes de sola — tudo escondido)_')
  out.push(...shown)
  out.push(`- modelos: ${styles.join(', ')}`)
}

writeFileSync('docs/sole-hierarchy/VERIFICACAO.md', out.join('\n') + '\n')
console.log('\nVerificação escrita: docs/sole-hierarchy/VERIFICACAO.md')
console.log(errors ? `❌ ${errors} valores inválidos (typos!)` : '✅ Todos os valores permitidos existem na additions-config.')
