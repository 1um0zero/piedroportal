# OSB — Feedback do Martin (FO_orderportal_30-6-2026.pptx)

Fonte: `docs/custom/FO_orderportal_30-6-2026.pptx` (11 slides, anotações sobre screenshots do
formulário CUSTOM). Extraído e mapeado a 2026-07-13. Config alvo:
`src/components/custom/custom-additions-config.ts` + `CustomOrderForm.tsx`.

Legenda: ✅ claro · ❓ precisa de esclarecimento (ver lista no fim).

## Slide 1 — Tab 1 (Customer & Product) + comportamento geral

- ✅ **Company** e **Customer/Patient** passam a campos obrigatórios.
- ❓ **"Isn't this the same?"** — setas apontam para os botões de Type **PAIR** e **LEFT/RIGHT**.
  É uma pergunta, não um pedido: PAIR = par com configuração igual; LEFT/RIGHT = par com
  configurações independentes. Responder ao Martin e/ou repensar labels para tirar a dúvida.
- ✅ Se o Type for **LEFT** ou **RIGHT**, o resto do formulário mostra apenas esse lado.
- ✅ Tab 2 (Customization) abre com **todas as secções fechadas** (hoje não abre assim).

## Slide 2 — Leest & Passchoenen (Last)

- ✅ **Eliminar "Wooden Last"** (fica Plastercast, Blueprint, Footscan).
- ✅ **Last Height** passa de mm livre a **dropdown**: Low last, 100, 120, 150, 200, 220, 250,
  300, 350 mm. ❓ confirmar que é um dropdown por pé (L e R separados, como o campo atual).
- ✅ **Last Height** e **Heel Height** = campos obrigatórios.
- ✅/❓ **Regra condicional**: escolhido um last height (100/150/200/250/300/350), a linha
  correspondente da **Leg & Ankle Circumference** passa a obrigatória. ❓ o texto omite 120 e
  220 (que existem no dropdown) — assumir que a regra cobre todas as alturas ≥100? E "Low last"
  não obriga nada? Confirmar.
- ✅ **Leg & Ankle Circumference**: acrescentar linha **100 mm** ao formulário; diagrama passa a
  ter todas as alturas em **mm** (nunca cm — norma para todo o formulário) e ganha as marcas
  120/220/300/350 mm. Lista final: 100, 120, 150, 200, 220, 250, 300, 350.
- ✅ Heading "LEESTMATEN" → **"Last measurements"** (i18n, não hardcoded NL).

## Slide 3 — Toe height / Fitting shoes / Toe shape

- ✅ Toe Height (I–V): sem alterações.
- ✅ **Plastic Fitting Shoes**: quando marcado, escolher entre **"Fitting shoe of last"** e
  **"Fitting shoe including supplement"**; a segunda torna o preenchimento da secção
  Supplement obrigatório.
- ❓ **Toe Shape (Neusvorm)**: os desenhos atuais estão errados; o slide traz os corretos
  (outline preto) mas em baixa resolução — **pedir os originais à Piedro** antes de trocar.

## Slide 4 — Supplement (tipos, materiais, heel height)

- ✅ **Renomear os tipos de supplement** (mapeamento 1:1 do slide):
  | Atual | Novo |
  |---|---|
  | Lateral Low Reinforcement | Lateral under ankle reinforcement |
  | Medial Low Reinforcement | Medial under ankle reinforcement |
  | Heel Low Reinforcement | Lateral/medial under ankle reinforcement ❓ |
  | Surrounding Orthoses | Lateral/medial over ankle reinforcement covering achilles tendon |
  | Lateral and Medial Orthoses | Lateral/medial over ankle reinforcement |
  | Lateral Orthoses | Lateral over ankle orthosis |
  | Medial Orthoses | Medial over ankle orthosis |

  ❓ a 3ª linha perde a noção de "heel" — a seta no slide é inequívoca, mas convém confirmar
  que não é lapso.
- ✅ **Sem indicação de altura**: os 3 tipos "under ankle" + Standard. **Com indicação de
  altura**: os 4 tipos "over ankle".
- ✅ SUPPLEMENT MATERIAL (Multiform + Cork / Micro Cork / Multiform) mantém-se.
- ✅/❓ **Material dos reinforcements** (chips Multiform/Micro Cork/Cork/EVA/PU) →
  **Ercoflex, Renoflex 1.1, Renoflex 1.5, Renoflex 1.9**. ❓ grafia: a marca real é
  **Rhenoflex** (é o que temos hoje no config) e o slide 10 usa "Renoflex 1.2" — confirmar
  grafia e se é 1.1 ou 1.2.
- ✅/❓ **Heel height (L/R mm)** no Supplement: autofill a partir do Leest & Passchoenen; se
  vazio lá, torna-se obrigatório aqui; o mesmo valor também autofill na secção Zolen.
  ❓ confirmar se é um campo novo visível no Supplement ou apenas a regra de autofill no campo
  Height da Zolen.
- ✅ Forefoot Provision: mantém-se igual.

## Slide 5 — Supplement measurements / Rocker

- ✅ **Supplement Measurements**: fundir "Heel — Medial" e "Heel — Lateral" numa única linha
  **"Heel"** (Ball mantém medial/lateral; Toe mantém-se).
- ✅ **Rocker** (no Supplement): quando marcado, os mm deixam de ser obrigatórios.
- ✅ Flare on the Back/Front e Leg Length Difference: sem alterações.

## Slide 6 — Bovenwerk (Upper)

- ✅/❓ Secção "Bovenwerk" → **"Schacht"**. ❓ isto é o label NL; confirmar o que fica em
  EN/FR/DE (Schacht é NL/DE; EN "Upper"?).
- ✅ **Article number (MODEL)**: pré-preenchido desde o início com o artigo escolhido.
- ✅ **Upper Height**: obrigatório.
- ✅ **Novo checkbox "Leathers as model"**, marcado por defeito; enquanto marcado, não há
  escolha de outros leathers. Se o cliente desmarcar para escolher cores → popup:
  *"A surcharge may apply if colors other than the standard colors are chosen."*
- ✅ **Voering/Lining**: eliminar distinção Upper/Rest; fica um único **"Lining"** com uma só
  fila de opções (Leather, Black Leather, Diabetic, Fur, Anti-Allergic, Sympatex).
- ❓ **Anti-slip heel + Perforated lining**: mostrar apenas quando "Leather **and** Black
  leather are checked" — interpretar como *lining = Leather OU Black Leather* (um lining é
  escolha única); confirmar.
- ✅ **Novo checkbox "Closure as model"**, marcado por defeito; igual à lógica dos leathers.
  Popup ao desmarcar/escolher outro closure: *"A surcharge may apply if closures other than
  the standard closure is chosen."*

## Slide 7 — Bovenwerk (resto)

- ✅ **Stretch**: ao marcar, popup *"Stretch is only possible if the model allows it."*
- ✅ **Eliminar**: secção Ankle Heel and Quarter; AFO (Left/Right); Busk (Left/Right).
- ✅ **Manter**: Collar (Extra Padding), Tongue (grupo completo), Extra pair of Laces.

## Slide 8 — Zolen (Soles)

- ✅ **Heel Type**: eliminar as sub-opções Left/Right — Medial/Lateral **em todos os tipos**;
  mantêm-se os 4 tipos (Heel, Hollow Wedge, Fully Hollow Wedge, Wedge).
- ✅ **Height (L/R)**: manter; autofill de Leest & Passchoenen + Supplements; se não estiver
  preenchido antes, obrigatório aqui.
- ✅ Measurement Back/Side: manter, **Back por defeito**.
- ✅ **Rocker sole**: passa a toggle yes/no; só com yes é que aparece o bloco
  (Heel/Joint/Toes + Rocker Sole Type).

## Slide 9 — Zolen (resto)

- ✅ Removable Carbon Insole, Sole Stiffening e Others (Rounded/Flare/Inwards/Sach
  Heel/Thomas Heel): sem alterações.

## Slide 10 — Contreforts (Stiffeners)

- ✅ **Seleção de stiffener independente por pé (L/R)**.
- ✅ **Eliminar a tabela** 1st/2nd layer — Back/Medial/Lateral (para todos os tipos).
- ✅/❓ Só o **high counter** exige altura (obrigatória). ❓ confirmar qual dos chips atuais é o
  "high counter" (contraforte alto).
- ✅ **Cada stiffener selecionado exige material** de dropdown: Renoflex 1.2 / 1.5 / 1.9,
  Renoflex 1.2/1.5/1.9 double, Ercoflex 2, Ercoflex 3, Ercoflex 2/Renoflex 1.2|1.5|1.9,
  Ercoflex 3/Renoflex 1.2|1.5|1.9, Leather (16 opções). (❓ grafia Renoflex/Rhenoflex, ver
  slide 4.)
- ✅ **Botão de informação** com o texto: *"All requested modifications will be placed between
  the lining and the upper leather. If this is not possible, the modification will be built up
  on the lining, after which the upper leather will be made over it. This may incur additional
  costs."*

## Slide 11 — Neus (Toe) + Order

- ✅ "Toe options" → **"Toe reinforcement options"**.
- ✅ "No toe" → **"No reinforcement"**.
- ✅ **Normal** selecionado por defeito.
- ✅ **Eliminar "Front"** (ficam No reinforcement, Normal, Short, Wing).
- ✅ External Protective Toe Cap: manter.
- ✅ **Eliminar "Urgent order"** do formulário custom.

## ❓ Questões a esclarecer (Martin / Anabela)

1. **PAIR vs LEFT/RIGHT** ("Isn't this the same?") — explicar a diferença; se preferir,
   propomos labels mais claros ("Pair — identical" / "Pair — different per foot").
2. **Last height dropdown** — um dropdown por pé (L/R separados)?
3. **Regra da circunferência obrigatória** — também para 120/220 mm? "Low last" isenta tudo?
4. **Toe shapes** — enviar os desenhos corretos em alta resolução.
5. **"Heel Low Reinforcement" → "Lateral/medial under ankle reinforcement"** — confirmar (a
   noção de "heel" desaparece).
6. **Renoflex vs Rhenoflex** — grafia oficial; e Renoflex **1.1** (slide 4) vs **1.2**
   (slide 10): são listas mesmo diferentes entre supplements e stiffeners?
7. **Anti-slip heel / Perforated lining** — "Leather and Black leather" = lining Leather **ou**
   Black Leather?
8. **Bovenwerk → Schacht** — só o label NL? O que fica em EN/FR/DE?
9. **Heel height no Supplement** — campo novo visível nessa secção, ou só autofill na Zolen?
10. **"High counter"** — qual das opções de stiffener atuais corresponde?

## Estado de implementação (2026-07-13)

Todos os pontos ✅ (inequívocos) foram implementados nesta data — config
(`custom-additions-config.ts`), `CustomAdditionsForm` (unit L/R, dropdowns, popups,
hiddenWhen, botão ⓘ, secções fechadas), `CustomOrderForm` (obrigatórios Tab 1, defaults,
autofill heel height, validação das regras) e o diagrama `leg-ankle.png` (labels em mm +
anéis 100–350). Interpretações provisórias adotadas enquanto não há resposta: dropdown do
Last Height é por pé; regra da circunferência cobre TODAS as alturas ≥100; rename do
"Bovenwerk"→"Schacht" só no NL; heel height = só autofill Leest→Zolen; grafia "Renoflex"
como o Martin escreveu. Ficam de fora (bloqueados): toe shapes (falta arte hi-res),
regra do high counter (Q10), condicional Anti-slip/Perforated (Q7).

## Notas de implementação

- Vários pedidos são a versão formal do que estava pendente em
  `project_custom_supplement_stiffener_images` (redesign da lista de stiffeners + materiais).
- Norma transversal do Martin: **tudo em mm, nunca cm** — já é o padrão do portal.
- Vários autofills cruzam secções (heel height: Last → Supplement → Zolen) — implementar como
  derivação no estado do form, não cópia manual.
