# Recado DSV → PP: filhos órfãos de toggles-pai desligados (formulário)

> **De:** DSV (A-Shell) · **Para:** PP (portal) · **Data:** 2026-07-24
> **Decisão do Jorge:** corrigir **no formulário**, NÃO no export — o export deve
> continuar a ser espelho fiel do que está gravado; a garantia "sem pai não há
> filho" pertence ao form.

## O problema (caso real, apanhado na consola)

Encomenda **26005831** (Piedro Ltd., ref 106011/405227): ficou gravado
`sw_taper.r = "Tapered to Toes"` com `sole_wedge.r = false` e
`sw_medial/sw_lateral = null`. O export ERP enviou o órfão; a consola importou-o
e mostrou um "Tapered" solto sem grupo; o PDF (secção ZOOL WIG suprimida com o
pai desligado) muito provavelmente **não** o mostra → produção via uma addition
que o cliente não vê. Sequência provável no form: ligar Sole Wedge → escolher
Aflopend → desligar Sole Wedge → o valor do filho ficou persistido.

Contraste com encomendas saudáveis (grupo completo):
- 26005826/27: `sole_wedge.l=true` + medial 20 + lateral 20 + taper ✓
- 26005754: `sole_float.r=true` + 12 + 1 + taper ✓

## O que se pede

**Ao desligar um toggle-pai no formulário (OSB e CUSTOM), limpar os valores dos
filhos desse pé** — e nunca persistir filhos com o pai desligado (idealmente
também validar no submit). O export não muda.

Atenção ao detalhe **por pé**: os pais são sided (l/r) — desligar o pai esquerdo
limpa só os filhos esquerdos.

## Mapa pai → filhos

É a coluna `parent` do `docs/erp-additions-map.csv` (fonte canónica). Resumo:

| pai | filhos |
|-----|--------|
| sole_float | sf_medial, sf_lateral, sf_taper |
| sole_wedge | sw_medial, sw_lateral, sw_taper |
| heel_wedge | hw_medial, hw_lateral, hw_taper |
| heel_float | hf_medial, hf_lateral |
| rocker | rocker_toes, rocker_joint, rocker_heel |
| amend_sole | sole_type, spoiler, runner_sole |
| pu_bumper | pu_type |
| zsm_prefab | zsm_prefab_colour |
| zsm_sheet | zsm_sheet_type, zsm_sheet_colour |
| haglund | haglund_h, haglund_p |
| xs_med_ank | med_ank_h |
| xs_lat_ank | lat_ank_h |
| gen_raise | gen_raise_add |

## Levantamento 2026 (feito pelo DSV, 2026-07-24, read-only)

`node scripts/diag-orfaos-pai-filho.mjs` (untracked, na raiz do repo) — 1853
encomendas de 2026 com additions analisadas; **5 exportadas com órfãos**
(15 com `--all`, mas as extra são antigas/não-exportadas, quase todas delivered):

| consola | cliente | ref | estado | órfãos |
|---------|---------|-----|--------|--------|
| 26005152 | Voetmax Roden | VX00065568-356259 | shipped | rocker_joint/heel L+R=4 (rocker OFF) |
| 26005381 | Voetmax Rotterdam | VX00067585-290646 | cutting | sole_type L+R="EVA Brown" (amend_sole OFF) |
| 26005437 | Piedro Ltd 105768 | 105768 | finishing | rocker_toes/joint/heel R=8/12/15 (rocker OFF) |
| 26005469/70 | Piedro Ltd 105869 | 105869/405006 | cutting | sf_medial/lateral L=3/1 (sole_float OFF) |
| 26005831 | Piedro Ltd 106011 | 106011/405227 | order_received | sw_taper R (sole_wedge OFF) — o caso-tipo |

Nota: os casos `rocker` (valores mm sem tipo de rocker escolhido) merecem decisão
própria do PP — pode ser meio-legítimo (mm sem tipo) ou a mesma classe de lixo;
alinhar o form com o que o PDF/produção deve entender.

## Aceitação

1. Form: ligar pai → preencher filho → desligar pai → gravar → o filho não fica
   nos `additions` da encomenda (por pé).
2. `/api/erp/orders` de uma encomenda nesse estado não traz o filho (consequência
   de 1, sem tocar no export).
3. Caso 26005831 documentado como referência (a ficha na consola foi corrigida à
   mão pelo Jorge).

## Contexto DSV (para não repetir o susto)

Na consola, um filho órfão aparece na grelha do icmedref como linha solta sem o
grupo-pai — foi assim que se apanhou. Qualquer dúvida sobre o lado A-Shell:
`ADDITIONS-FOR-DSV.md` é o canal.
