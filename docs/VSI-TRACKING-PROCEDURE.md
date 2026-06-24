# Registar tracking codes/links na VSI → portal

> Guia operacional para a **Christina** (VSI), na transição da Cátia.
> **Comunicação com a VSI é sempre em PT** (a Anabela, em Cc, também fala português).
> Confirmado ponta-a-ponta (portal + A-Shell `rotulos.bpi` / `portal1.bpi`) em 2026-06-24.
> Contexto técnico durável: ver [[project_tracking_flow]] na memória do projeto.

## Procedimento (para a Christina)

**Onde:** ecrã de expedição/etiquetas — programa **657000** (`rótulos`), a grelha de expedição.

1. Escrever o **código de tracking** na coluna do tracking code, na linha da encomenda.
2. O **envio para o portal é automático ao validar a célula** — não há botão "enviar ao
   portal". Assim que confirma a célula, o sistema:
   - se o código começa por **`1ZY`** → assume **UPS** (transportadora `005`) e
     **constrói o link sozinho**;
   - propaga o código às sub-linhas (pares) da mesma encomenda;
   - grava no cartão do cliente; e
   - faz o POST ao portal.

## ⚠️ A armadilha da transição (o que a Cátia fazia "no automático")

O portal só recebe o tracking se **código E link** estiverem ambos preenchidos
(`rotulos.bpi` linha 2920). O link é construído a partir da transportadora:

- **Códigos UPS (`1ZY…`)** → automático, flui tudo sem mais nada.
- **Código que NÃO comece por `1ZY`** (outra transportadora) → tem de **definir primeiro a
  transportadora na coluna respetiva (col. 15)**; senão o link fica vazio e **nada chega ao
  portal**, mesmo tendo escrito o código.

## Resumo de uma linha (para enviar)

> No ecrã de expedição (657000), escreve o código de tracking na linha da encomenda. Para
> UPS (`1ZY…`) é automático e instantâneo. Para outra transportadora, escolhe primeiro a
> transportadora na coluna ao lado — caso contrário o link não se constrói e nada chega ao
> portal. Não há botão "enviar": o envio dá-se ao validar a célula.

## Estado / prova viva

- O cano **já funciona**: a Christina já enviou tracking com sucesso (ex. encomendas
  #4283 / #4280 com `1ZY…` da UPS, empurradas ainda em produção).
- Lado portal corrigido (2026-06-24): o gate que escondia o track & trace até `delivered`
  foi removido — agora aparece **desde o despacho**, na lista (coluna *Delivery*) e na ficha
  da encomenda (bloco *Track & Trace*).

## Cadeia técnica (referência)

1. Operador → grelha de expedição `rotulos.bpi` (programa **657000**).
2. `portal1.bpi` → `FN'portal'order'update` (ações 5/6) constrói o JSON e faz o POST.
3. Portal: `POST /api/erp/orders/status` grava `tracking_code` + `tracking_link`.
