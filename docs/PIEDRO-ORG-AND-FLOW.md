# PIEDRO INTERNATIONAL — Organização, fluxo de encomendas & integração VSI

> Referência viva do contexto de negócio. Condiciona o desenho do portal, dos estados das
> encomendas, dos branches e da futura integração com o ERP. Fonte: briefing do Jorge (2026-06-08).

## 1. A empresa

**PIEDRO INTERNATIONAL** — empresa holandesa de calçado ortopédico. Dono: **Emil van Swaal**.

Áreas de negócio:
1. **pair-by-pair** — **este portal**. Calçado por pares de catálogo + additions ortopédicas.
   - 1.1. Sub-áreas **Livingstone** e **ZSM** — são um **filtro sobre o portal** (a tratar mais tarde).
2. **custom** — **próxima área a desenvolver** no portal; permite muito mais alterações ao sapato.
3. **fashion** — fora de âmbito por agora.

## 2. Quem é quem

| Entidade | Papel |
|---|---|
| **Emil van Swaal** | Dono da PIEDRO INTERNATIONAL. |
| **Anabela Lopes** (`anabela`, conta `alopes`) | Em **NL**. Interlocutora do Jorge para tudo. **Admin do portal (piedro_admin)** com acesso total. Adora mapas, estatísticas, dashboards e análise. → o destinatário natural dos dashboards/briefings. |
| **NL** (head office) | Regista o Piedro Order no ERP de NL, valida e aprova encomendas no portal. |
| **UK** (escritório) | Igual a NL, em breve. |
| **VSI** = VSI-Orthopedics | **Fábrica em Portugal** (ex-cliente do Jorge). Corre o ERP **SHUZ**. Recebe encomendas de NL e UK, fabrica e entrega. PT é o idioma. |
| **VSI-C / VSIC** = VSI-Custom | Secção **fiscalmente autónoma** dentro das mesmas instalações da VSI; mantém ligações orgânicas com a VSI. No A-Shell é uma área à parte que comunica com a da VSI. **A VSIC vai comunicar com a futura área "custom" do portal.** |

Resumo hierárquico: **PIEDRO INTERNATIONAL — Emil** → `anabela` · **NL** · **UK** · **VSI** · **VSI-C**.

## 3. O ERP da fábrica

- **SHUZ** — ERP específico para fábricas de calçado, desenvolvido na plataforma **A-Shell** da
  **Microsabio** (USA). Corre numa **VM Windows** num Datacenter.
- Executável: `c:\piedro\platuz\bin\ashw32.exe` (a-shell), invocável com parâmetros.
- Fluxo atual de entrada na VSI: recebe NL/UK por **email** e importa do portal por **http (a-shell)**
  + **CRUD via API do Power Pages**. Pelo mesmo método cria/atualiza **companies** e **atualiza estados**.

## 4. Ciclo de vida da encomenda (portal)

1. **Cliente regista** a encomenda no portal → estado de aprovação **`registered`** (registada).
2. **NL / UK validam** no portal (precisam de ver facilmente **o que está em aberto**) e atualizam:
   - Preenchem o **Piedro Order** = nº da encomenda no **ERP de NL/UK** → coluna `piedro_order_id`
     (Dataverse: **`cr56f_order_piedro`**, preenchida pelo **staff_piedro**, *não* pelo a-shell).
     Este nº é **fundamental para a VSI importar**.
   - Com o Piedro Order + decisão → **`approved`** (aprovada, com data) → pronta a importar pela VSI.
   - Pode ficar **a aguardar aprovação** mesmo com Piedro Order preenchido (cliente tem de pagar
     primeiro, ou há pendência) → `awaiting_payment` / `under_analysis` / `need_attention`.
3. **VSI importa** a aprovada e o **ERP da VSI vai atualizando os estados de produção**; cliente e
   PIEDRO acompanham no portal.

### Mapeamento para o modelo de estados atual (`src/lib/order-status.ts`)

| Negócio | Campo / valor no portal |
|---|---|
| registada | `approval_state = registered` |
| a aguardar aprovação | `awaiting_payment` · `under_analysis` · `need_attention` |
| aprovada (com Piedro Order + data) | `approval_state = approved` (exige `piedro_order_id`) |
| recusada | `refused` |
| processada / recebida na fábrica | `production_state = order_received` / `in_preparation` |
| em produção · corte · costura · acabamento | `cutting` · `stitching` · `finishing` (+ mounting/fitting/…) |
| delivered | `production_state = delivered` |
| **invoiced** | ⚠️ falta `invoice_number` + `invoice_date` — **vêm da VSI pelo a-shell** (status-back) |
| **shipped / tracking** | ⚠️ falta `tracking_number` + `tracking_url` — **vêm da VSI pelo a-shell**; cliente quer **link** clicável |

> **Auditoria de estados (requisito do Jorge, 2026-06-08):** cada estado/transição deve guardar
> **timestamp + utilizador** que o mudou (staff, cliente ou sistema/a-shell). Hoje não é assim; passa a
> ser via uma tabela de histórico (ver §8).

## 5. Briefing pós-login (concretização do tracker §16.1)

O principal a relatar é o **estado das encomendas**:
- **Staff (Piedro):** "estão **x** encomendas para aprovar; não esqueças as **y** pendentes de decisão."
- **Cliente:** "as encomendas em andamento já foram aprovadas; **x** em produção, **y** delivered."

## 6. Próxima grande etapa — importação para a VSI (fluxo invertido)

Hoje a VSI "puxa". O Jorge quer **inverter** para o portal ser o ponto de partida:
- O **staff da VSI** acede a uma **área "produção"** do portal onde vê **todas as encomendas por
  importar/integrar** (aprovadas e ainda não integradas).
- Essa área é um **branch** (como será a VSIC), **em PT** (staff fala português; entende inglês).
- Acedida no **browser a partir da VM Windows** do Datacenter onde corre o SHUZ, para:
  1. **gerar um ficheiro** com todos os dados das encomendas;
  2. **executar `c:\piedro\platuz\bin\ashw32.exe`** (a-shell) com parâmetros — o a-shell sabe o resto;
  3. o a-shell **atualiza o portal** com o estado (registo da importação via **http** ou outro método
     adequado).
- Já existe a base do contrato/endpoints ERP (`src/lib/erp/order-contract.ts`,
  `/api/erp/orders`, `/api/erp/orders/status`) — alinhar com este fluxo invertido.

## 7. Decisões de importação de dados históricos (Dataverse → Supabase)

- **Só step == 3** é importado (encomendas confirmadas). **step < 3 = esquecer**: não importar,
  **apenas constar no relatório final** (com histograma de steps), para haver prova de que nada ficou
  esquecido do outro lado. Distinção do Jorge: *"esquecemo-nos de processar"* (mau) ≠ *"não importámos
  por um motivo expresso"* (controlado/auditável).
- **`cr56f_order_piedro` → `piedro_order_id`** (✅ confirmado 2026-06-08): é a "Piedro Order" que o
  staff usa. Está **preenchido em todas** as encomendas, **excepto** as registadas no próprio dia da
  importação final; se vier vazio, é **step<3** ou um **teste**. Import já mapeia.
- **`cr56f_name`** = ID da encomenda no Power Pages, **usado só para comunicar via API** — nenhum humano
  o usa. Não mostrar a utilizadores; manter apenas como referência técnica de integração.
- **"unresolved"** na página de unassigned é apenas o *fallback* (sem `import_note`), porque o backfill
  ainda não correu — **não** é sinónimo de step<3. O `cr56f_step` **não é guardado** na BD, logo step<3
  não é distinguível em SQL; a limpeza faz-se por DELETE das linhas que não estão no conjunto step-3.

## 8. Histórico/auditoria de estados (requisito 2026-06-08)

Cada transição de estado deve registar **quem** e **quando**. Desenho proposto:
- Tabela `order_state_events`: `id, order_id, field` (status | approval_state | production_state),
  `old_value, new_value, changed_by` (user_id, NULL p/ sistema), `source` (portal | erp | import),
  `actor_label` (ex. "a-shell", nome do staff), `created_at`.
- Escrever um evento em **todos** os pontos de mutação: submit do cliente, `updateOrderAdminAction`
  (staff), `/api/erp/orders/status` (a-shell). Mostrar **timeline** na ficha da order.
- Histórico começa agora (migradas só têm o estado atual). Pode também alimentar o briefing/dashboards.
