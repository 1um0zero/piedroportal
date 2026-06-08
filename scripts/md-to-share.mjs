/**
 * Render internal markdown docs to styled, self-contained HTML under public/share/
 * (so they're reachable from the admin Docs hub). Re-run after editing the sources.
 *
 *   node scripts/md-to-share.mjs
 */
import { readFileSync, writeFileSync } from 'fs'
import { marked } from 'marked'

const DOCS = [
  { src: 'docs/compliance/CLIENT-ACTIONS.en.md',    out: 'public/share/client-actions-en.html',    title: 'Client Action List (EN)' },
  { src: 'docs/compliance/CLIENT-ACTIONS.nl.md',    out: 'public/share/client-actions-nl.html',    title: 'Actielijst klant (NL)' },
  { src: 'docs/compliance/COMPLIANCE-REPORT.en.md', out: 'public/share/compliance-report-en.html', title: 'Compliance Report (EN)', draft: true },
  { src: 'docs/compliance/COMPLIANCE-REPORT.nl.md', out: 'public/share/compliance-report-nl.html', title: 'Compliance-rapport (NL)', draft: true },
]

const DRAFT_BANNER = `<div style="background:#fde8e8;border:1px solid #f5c2c2;color:#b91c1c;border-radius:10px;padding:12px 16px;margin:0 0 20px;font-size:13px">
  <strong>⚠ Draft — not certified.</strong> AI-drafted; must be reviewed and certified by a DPO / legal counsel before any official publication.
</div>`

const shell = (title, body, draft = false) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>Piedro Portal — ${title}</title>
<style>
  :root{--gold:#B8975A;--gold-dark:#9A7A42;--ink:#1c1917;--stone:#44403c;--stone-l:#a8a29e;--line:#e7e5e4;--bg:#faf8f4}
  *{box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--ink);line-height:1.6;margin:0}
  .page{max-width:820px;margin:0 auto;padding:40px 28px 80px}
  .back{display:inline-block;margin-bottom:22px;font-size:13px;color:var(--gold-dark);text-decoration:none}
  .back:hover{text-decoration:underline}
  .doc h1{font-size:26px;font-weight:800;letter-spacing:-.4px;margin:.2em 0 .5em;border-bottom:3px solid var(--gold);padding-bottom:.3em}
  .doc h2{font-size:18px;font-weight:800;color:var(--gold-dark);margin:1.6em 0 .5em}
  .doc h3{font-size:15px;font-weight:700;margin:1.2em 0 .4em}
  .doc p{margin:.6em 0;color:var(--stone)}
  .doc ul,.doc ol{margin:.5em 0 .8em;padding-left:1.4em}
  .doc li{margin:.3em 0;color:var(--stone)}
  .doc a{color:var(--gold-dark)}
  .doc code{background:#f3ecdd;color:var(--gold-dark);padding:1px 5px;border-radius:5px;font-size:.88em}
  .doc pre{background:#1c1917;color:#fafaf9;padding:14px 16px;border-radius:10px;overflow:auto;font-size:13px}
  .doc pre code{background:none;color:inherit;padding:0}
  .doc blockquote{border-left:3px solid var(--gold);margin:.8em 0;padding:.2em 0 .2em 14px;color:var(--stone-l);font-style:italic}
  .doc table{border-collapse:collapse;width:100%;margin:1em 0;font-size:13.5px}
  .doc th,.doc td{border:1px solid var(--line);padding:7px 10px;text-align:left}
  .doc th{background:#f3ecdd;color:var(--gold-dark)}
  .doc hr{border:none;border-top:1px solid var(--line);margin:1.6em 0}
  .doc strong{color:var(--ink)}
  @media print{body{background:#fff}.back{display:none}}
</style>
</head>
<body>
  <div class="page">
    <a class="back" href="/share/index.html">← Admin docs</a>
    ${draft ? DRAFT_BANNER : ''}
    <article class="doc">
${body}
    </article>
  </div>
</body>
</html>
`

for (const d of DOCS) {
  const md = readFileSync(d.src, 'utf8')
  const body = marked.parse(md)
  writeFileSync(d.out, shell(d.title, body, d.draft))
  console.log(`✓ ${d.src} → ${d.out}`)
}
