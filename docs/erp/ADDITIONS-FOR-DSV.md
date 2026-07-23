# Additions — informação para o DSV (A-Shell)

> **Porta de entrada do lado A-Shell.** Quando o Jorge disser *"vai ao PP, tem
> info nova sobre additions"*, é **aqui** que começas. Este documento diz-te
> onde está a verdade, o que mudou, e o que tens de ajustar no A-Shell.

## A regra (porquê isto existe)

Sempre que uma addition é **criada, alterada ou anulada** no portal, o portal
**prepara aqui tudo** o que o A-Shell precisa — tu só vens buscar e ajustar o
lado A-Shell no `dsv` (`shuz_portal_integration`). O portal exporta cada addition
de uma encomenda pela **`key`** do campo (`explodeAdditions` →
`/api/erp/orders`), por isso é nessa `key` que o mapeamento A-Shell assenta. Uma
`key` que o A-Shell não conheça = a addition **cai** silenciosamente no ERP.

## Onde está a verdade (2 fontes, sempre sincronizadas com o código)

1. **Catálogo vivo (machine-readable)** — `GET /api/erp/additions`
   - Auth: `Authorization: Bearer <ERP_API_TOKEN>` (o mesmo dos outros endpoints ERP).
   - Gerado a partir do config do formulário, por isso **nunca desatualiza**.
   - Cada entrada: `{ channel (osb|custom), section, key, type, side, parent,
     values, unit, dataverse_key, labels{en,nl,fr,de} }`.
   - `key` = exatamente o `field` que vem em `/api/erp/orders`.
   - Poll barato para saber se mudou algo: `GET /api/erp/additions?hash_only=1`
     → `{ catalog_version, hash, count }`. Se o `hash` mudou desde a última vez,
     há novidade; puxa a lista completa e vê o CHANGELOG abaixo.
   - Filtrar canal: `?channel=osb` ou `?channel=custom`.

2. **Mapa portal → A-Shell (onde TU escreves)** — `docs/erp-additions-map.csv`
   - Colunas: `portal_section;portal_key;type;side;parent;dataverse_key;`
     `ashell_add1_field;ashell_add1_no;ashell_add3_slot;notes`.
   - O portal preenche as colunas do lado portal e deixa as colunas A-Shell
     **vazias com `TODO-DSV`** quando há uma addition nova. É aí que entras: dás
     o `ashell_add1_field` / `add1_no` / `add3_slot` e tratas o lado L/R.

## Como o portal fica quando prepara uma mudança (o que procurar)

- **CREATE** — nova linha no CSV com colunas A-Shell vazias + `TODO-DSV`; nova
  entrada no CHANGELOG; a `key` passa a aparecer no catálogo e em `/api/erp/orders`.
- **CHANGE** — a linha do CSV / entrada do catálogo muda (novos `values`, novo
  `type`, novo `side`…); entrada no CHANGELOG a explicar o quê.
- **REMOVE** — a addition sai do config (deixa de aparecer no catálogo); a linha
  do CSV é marcada `REMOVED <data>` (não apagada, para histórico); CHANGELOG diz
  para desativar/ignorar essa `key` no A-Shell.

---

## CHANGELOG (o que há de novo — mais recente primeiro)

### 2026-07-20 · CREATE · osb · `stiff_cutout` — ✅ mapeado no A-Shell (2026-07-23)
- **DSV:** slot **095** (`add03_stiffener'cutout'achilles`, era `add'livre'095` no
  additions.stru) + seed `03.04.1` no `addportal.bpi`; toggle L/R tratado pelo
  caminho genérico (como `toe_puffs_rim`). cl000 226.7(011) / pp0001 226.7(007)
  em produção (FTP 23-jul).
- **2026-07-23 (2ª ronda):** faltava o esqueleto no `additions.fnp` (a linha não
  aparecia no PP0003/ficha) — acrescentado (`03.04.1` "Stiffener Cutout Achilles",
  toggle): pp0003 226.7(005), icmedref 226.7(004), ic0982 226.7(004),
  icgstec 226.7(003) compilados e staged (falta FTP destes 4).

- **Nome:** Contrefort uitsparing achillespees (recorte do contraforte para o
  tendão de Aquiles). Secção **Upper** (Schacht aanpassingen), a seguir a
  *Contrefort Hardheid*.
- **Tipo:** `toggle` · **Lado:** `both` (L/R independente) · **Valores:** —
  (sim/não por pé) · **dataverse_key:** `cr56f_stiffenercutoutachilles`.
- **No `/api/erp/orders`** chega como uma linha por pé ativado:
  `{ section:"upper", field:"stiff_cutout", side:"l"|"r", type:"toggle", value:true }`.
- **A fazer no A-Shell:** atribuir o campo/slot A-Shell para `stiff_cutout`
  (ver linha `TODO-DSV` no CSV) e tratar o lado L/R como nos outros toggles
  sided da secção Upper (ex.: `toe_puffs_rim`, `str_leather`).
- Portal: commit `8b66fd0` (form + i18n + ilustração).
