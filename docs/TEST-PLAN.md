# Piedro Portal — Plano de Testes pré-lançamento

> Execução manual no deployment Vercel (não há suite automatizada). Cada cenário tem um ID
> (`U-` user, `S-` staff/branch, `A-` admin, `X-` cross-cutting/segurança). Marcar ✅/❌ + notas.
> Referência cruzada: tracker §11 (gates GO/NO-GO).
>
> **Última atualização:** 2026-06-11

## 0. Preparação (uma vez)

- [ ] Contas de teste numa company **TESTES\*** (excluída de stats):
  - `user-teste` — role `user`, com company
  - `user-pendente` — role `user`, **sem** company (pending approval)
  - `cadmin-teste` — role `company_admin`
  - `branch-teste` — role `branch_staff` (branch com model-scope limitado, ex.: 2 style_names)
  - `padmin` — piedro_admin (Anabela ou conta espelho)
  - `sadmin` — super_admin (tavares@umzero.pt)
  - 1 company com sigla exclusiva (ex.: LIV) + 1 company sem sigla
- [ ] Confirmar migrations 001–018 em prod (tracker §25.11) + SQL de cores das traduções.
- [ ] Stock: ≥1 modelo `is_stock` com qty por size em `/admin/stock` (ex.: 2 pares num size).
- [ ] Browser limpo (Ctrl+Shift+R) + testar em desktop e mobile (pelo menos os fluxos core).

---

## 1. Visitante (não autenticado)

| ID | Cenário | Esperado |
|---|---|---|
| U-01 | Abrir `/` e `/homenew` | Carregam; `/` intocada; homenew com CTAs Ortho Soft/EVO |
| U-02 | Gallery pública sem login | Abre; tabs KIDS/MEN/WOMEN; **modelos exclusivos NÃO aparecem** |
| U-03 | Filtros gallery (closure/type/colour/construction/width/size/search) | Filtram; valores traduzidos nos 4 locales |
| U-04 | Detalhe de produto | Imagens + loupe + variantes; botão Order → redireciona para login |
| U-05 | Aceder direto `/orders`, `/wishlist`, `/admin`, `/stock` | Redirect para login (middleware) |
| U-06 | Partilha de link (OpenGraph) | Preview com imagem/título correto |
| U-07 | Trocar locale EN/NL/FR/DE em todas as páginas públicas | Tudo traduzido, sem PT hardcoded |
| U-08 | `/catalogues` | Verificar gate: abre ou exige login conforme decidido |

## 2. User normal (clínica, com company)

### Auth
| ID | Cenário | Esperado |
|---|---|---|
| U-10 | Login utilizador migrado (1ª vez) | Forçado a definir password (`must_set_password`) antes de qualquer página |
| U-11 | Login normal | Redirect para `/{locale}/gallery`; navbar mostra estado logado |
| U-12 | Forgot password | Email chega (não-spam); link single-use, expira 2h; reutilizar token → falha |
| U-13 | Logout | Sessão limpa; sessionStorage do order form purgado (privacidade) |
| U-14 | Registo novo | Perfil criado pendente; email interno de novo user chega |

### User pendente (sem company)
| ID | Cenário | Esperado |
|---|---|---|
| U-15 | Botão Order no produto | Mensagem "pendente aprovação" traduzida; não consegue encomendar |
| U-16 | `/stock` | Bloqueado (pending users blocked) |

### Encomenda configurada (fluxo core — repetir nos 5 modos)
| ID | Cenário | Esperado |
|---|---|---|
| U-20 | Tab1 PAIR: construction/width filtrados, size chips, scale EU vs UK conforme `size_unit` | Validação bloqueia avanço sem campos obrigatórios |
| U-21 | Tab1 LEFT / RIGHT | Só o lado relevante é gravado |
| U-22 | Tab1 LEFT_RIGHT | Construction/width/size independentes por pé |
| U-23 | Tab1 DIFF_SIZES | Sizes diferentes por pé |
| U-24 | Tab2 additions: campos sided L/R, condicionais indentados, mm snap + sufixo " mm", toggle no título ativa L+R, Rocker collapse, GLB viewer | Tudo conforme; valores traduzidos |
| U-25 | `adds_exclude` do produto | Campos excluídos não aparecem |
| U-26 | SAVE DRAFT (topo e fundo) → reabrir draft | Estado restaurado por completo |
| U-27 | Tab3: resumo (parents como headers, mm à direita, zeros como "—") + Preview PDF watermark "NOT CONFIRMED" | Tudo correto e traduzido |
| U-28 | Submit final | Confirmação; order em `/orders` como submitted; counter de dispatch calculado |
| U-29 | Emails pós-submit | Interno (locale `notify_locale`) + confirmação ao cliente (locale da order, PDF anexo/sem watermark, Cc/Bcc do perfil e company aplicados, cópia para branch em scope **na língua da branch**) — **atenção item 26.1: email não chegava** |
| U-30 | PDF final | Logo+tagline, foto produto, child fields indentados, sem ✓ Unicode, URL assinado, bucket privado (URL direto sem assinatura → 403) |

### STOCK
| ID | Cenário | Esperado |
|---|---|---|
| U-35 | `/stock` grid | Só modelos `is_stock` com available>0; sizes esgotados ocultos |
| U-36 | Clicar size até ao cap | Chip desativa + tooltip "limited to X pairs" |
| U-37 | Multi style.colour num só pedido + comments + customer fields (`reference_customer` obrigatório) | Submit OK; **sem estado draft** |
| U-38 | Reserva | Submeter 2 pares de stock=2 → grid passa a 0 disponível para outro user; cancelar a order → volta a 2 |
| U-39 | Oversell com grid stale | 2 tabs: ambos tentam o último par → o 2º submit é rejeitado server-side |
| U-40 | Pós-submit stock | PDF multi-linha + 3 emails; order aparece em `/orders` com badge STOCK + "N models · M pairs"; detalhe `/orders/stock/[id]` read-only |

### Lista de orders, wishlist, extras
| ID | Cenário | Esperado |
|---|---|---|
| U-45 | `/orders`: métricas clicáveis, filtro status, search, urgent, paginação 50, sort + filtros por coluna | OK; **só vê as suas próprias orders** |
| U-46 | Dispatch badge/countdown nas orders | Cores corretas; migradas sem data → ver 26.4 |
| U-47 | Order detail: prev/next navigator, tradução do resumo para o locale do viewer | OK |
| U-48 | Duplicar order | Só visível ao dono |
| U-49 | Wishlist: adicionar/remover + badge navbar | OK |
| U-50 | Profile: editar Cc/Bcc | Persiste e é aplicado no próximo email |
| U-51 | Chat assistant | Responde sobre as suas orders; **não revela** dados de outras companies nem briefing back-office |
| U-52 | Dashboard do user | Números corretos, zeros como "—", i18n completo |
| U-53 | Exclusividade: user de company LIV vê modelos LIV (toggle/entrada Livingstone); user sem sigla não os vê em gallery, search, detalhe direto por URL, nem no `/stock` | Sem fuga por URL direto |

## 3. Company admin

| ID | Cenário | Esperado |
|---|---|---|
| S-01 | `/orders` | Vê orders de **toda a company** (incl. migradas, ligação ao nível da company), não de outras |
| S-02 | Encomendar | Igual ao user normal |
| S-03 | Sem acesso a `/admin/*` | Redirect/403 |
| S-04 | Dashboard company_admin | Scope = company; i18n |

## 4. Branch staff

| ID | Cenário | Esperado |
|---|---|---|
| S-10 | `/admin/orders` | Só orders cujo style_name ∈ model-scope da branch; stock orders se **qualquer** modelo estiver em scope |
| S-11 | Catálogo | `sees_full_catalogue`/`branch_models` respeitado na gallery e back-office |
| S-12 | "New orders" shortcut (gold) + badge | Conta só orders portal-origin não validadas (exclui migradas) |
| S-13 | Mudar status de uma order em scope | OK; order fora de scope → inacessível (também por URL direto) |
| S-14 | Sem acesso a settings/companies/users/unassigned | Bloqueado |
| S-15 | Cópia de email da branch | Order com modelo em scope → branch recebe cópia no locale da branch |

## 5. Piedro admin (Anabela)

| ID | Cenário | Esperado |
|---|---|---|
| A-01 | `/admin/orders`: todas as orders, métrica/filtro "New", coluna Additions, status change + Save All, detalhe stock `/admin/orders/stock/[id]` (estados terminais libertam reserva) | OK |
| A-02 | `/admin/products`: import Excel (XLS .xlsx, col F OUT pré-excluído/STOCK flag, rejeitados com campos em falta), upload+normalize imagens, CRUD | OK; "never overwrite" respeitado |
| A-03 | `/admin/products/order`: drag + multi-select | Gallery reordena por `gallery_position` |
| A-04 | `/admin/stock`: adicionar modelo + qty por size | Reflete no `/stock` grid |
| A-05 | `/admin/companies`: detalhe, members & admins (atribuir company_admin), Cc/Bcc da company, exclusive label (legacy) — multi-sigla N:N ainda não tem UI (26.7) | OK |
| A-06 | `/admin/users`: gestão, badges de role (super_admin estático) | OK |
| A-07 | Branches: criar/editar, notify email + locale, model scope | Fan-out funciona (S-15) |
| A-08 | `/admin/settings`: notify emails, `notify_locale`, dispatch lead-time + factory calendar | Alterar calendário → recompute |
| A-09 | `/admin/settings/texts`: editar set-password/reset por locale + "Propose from English" (Haiku) | Override aplicado no email/página reais |
| A-10 | `/admin/translations`: zona de traduções de filtros | Valor novo reflete na gallery |
| A-11 | Dashboard admin + briefing do chat (role-gated) | Números corretos; orders TESTES* fora das stats (confirmar 16.2) |
| A-12 | **Não** vê `/admin/orders/unassigned` | Super_admin-only |
| A-13 | Orders migradas (3107): labels de option-sets legíveis (não códigos 987…), piedro_order_id presente, status approved/submitted corretos | OK |

## 6. Super admin (Jorge)

| ID | Cenário | Esperado |
|---|---|---|
| A-20 | Herda tudo de piedro_admin | OK (`isPiedroAdmin` inclui super) |
| A-21 | `/admin/orders/unassigned` | Lista + razões de import |
| A-22 | piedro_admin por URL direto a unassigned | Bloqueado (guard server-side) |

## 7. Cross-cutting / segurança / técnica

| ID | Cenário | Esperado |
|---|---|---|
| X-01 | **RLS (migration 002)**: com anon key, tentar ler orders/profiles de outra company via REST do Supabase | Bloqueado — gate 10.1 |
| X-02 | `?draft=` de order de outro user em `/gallery/[id]/order` | Recusado (fix de 06-07) |
| X-03 | API routes sem sessão/token (`/api/erp/orders` sem `ERP_API_TOKEN`, `/api/chat`, `/api/orders/preview`, notify-new-user sem secret) | Todas 401/403 |
| X-04 | Bucket `order-pdfs` privado; URL não assinado | 403 |
| X-05 | Tab partilhada: user A faz draft, logout, user B login | B não vê dados do paciente de A (sessionStorage scoped) |
| X-06 | i18n sweep: percorrer todas as páginas nos 4 locales | Sem chaves cruas (`emails.xxx`), sem PT hardcoded; labelFr/De em falta nas additions = conhecido (12.2) |
| X-07 | Emails: deliverability NL (não-spam), SPF/DKIM/DMARC após domínio Resend | Gate 6.6/6.7 |
| X-08 | ERP `GET /api/erp/orders` com token | Contrato v2: additions explodidas (array normalizado), todas as orders registered+approved |
| X-09 | ERP `POST /ack` + status-back | Estado muda + (quando 18.8 existir) evento de auditoria |
| X-10 | Footer de versão + botão refresh | Timestamp do build correto após deploy |
| X-11 | Mobile: navbar, gallery, order form, stock grid, admin nav | Usável sem overflow |
| X-12 | Performance básica: gallery e /orders com dados reais (3107 orders) | <3s; paginação server em blocos funciona |
| X-13 | Hard-refresh após deploy | Sem estado inconsistente (mistura de chunks antigos) |

## 8. Ordem de execução sugerida

1. **X-01..X-05** (segurança) — se falham, parar.
2. **U-10..U-14** (auth) → **U-20..U-30** (order core) → **U-35..U-40** (stock).
3. **U-45..U-53** (listas/extras) e secções 3–6 por role.
4. **X-06..X-13** (i18n, emails, ERP, mobile, perf).
5. Resultado → gates §11 do tracker → **GO / NO-GO**.

## 9. Registo de execução

| Data | Tester | Role(s) | IDs corridos | Falhas | Notas |
|---|---|---|---|---|---|
| | | | | | |
