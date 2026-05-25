# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server (Turbopack)
npm run build    # production build
npm run lint     # eslint
```

No test suite exists yet.

## Development Workflow

**IMPORTANT**: This project does NOT run locally. All development work follows this workflow:

1. **Make code changes** in the local repository
2. **Commit** changes with descriptive messages
3. **Push** to GitHub (`master` branch)
4. **Vercel** automatically deploys (1-2 min)
5. **Test** on the live deployment URL

When implementing features:
- After code changes are complete, always commit and push immediately
- User must hard-refresh browser (Ctrl+Shift+R) after Vercel deploys
- Database migrations must be run manually in Supabase SQL Editor before pushing code that depends on new schema

The live app is accessed via Vercel deployment, not `localhost`.

## Architecture

**Piedro Portal** is a B2B ordering portal for Piedro International (Dutch orthopedic footwear), replacing a Power Pages / Dataverse portal. Users are orthopedic clinics that browse the product catalogue, configure orthopaedic additions (insoles, heel lifts, etc.) per foot, and submit orders.

### Routing

All pages live under `src/app/[locale]/` — next-intl handles the `en/nl/fr/de` prefix. The default locale (`en`) is prefix-free (`localePrefix: 'as-needed'`). Navigation utilities that are locale-aware are in `src/i18n/navigation.ts`; always import `Link`, `useRouter`, `redirect` from there, never from `next/navigation` directly.

Auth guard lives in `src/middleware.ts`. Only `/orders`, `/wishlist`, and `/admin` require login — the gallery is public. The middleware also runs the next-intl i18n middleware.

### Supabase clients — three flavours

| File | When to use |
|---|---|
| `src/lib/supabase/client.ts` | Client components (`'use client'`) |
| `src/lib/supabase/server.ts` | Server components and Server Actions — reads cookies for the user session |
| `src/lib/supabase/service.ts` | Server-only, bypasses RLS — use for admin operations only, never import in client components |

After `signInWithPassword` on the client, use `window.location.replace(`/${locale}/gallery`)` (not `router.replace`) — the App Router client-side navigation does not force the server to re-read the new Supabase session cookies.

### Auth state on the client

`AuthContext` (`src/contexts/AuthContext.tsx`) is seeded server-side in the locale layout and kept in sync via `onAuthStateChange`. It exposes `{ isLoggedIn, isAdmin, hasCompany, profile }`. Components that branch on auth state use `useAuth()`.

### Data model (key types in `src/types/index.ts`)

- **Product** — has `constructions: Construction[]` (each construction has a name + available widths). Products are queried with `.eq('active', true)`. Images live in the Supabase `products` bucket; `picture_name` is the storage path.
- **Order** — has `unit` (PAIR/LEFT/RIGHT/LEFT_RIGHT/DIFF_SIZES), sided size/construction/width fields, and `additions` (JSONB). Additions store `{ l, r }` pairs for sided fields, or a scalar for global fields.
- **Profile** — `role` is `user | company_admin | piedro_admin`. A user without `company_id` is pending approval and cannot order.

### Additions form

`src/components/order/additions-config.ts` is the single source of truth for all orthopedic addition fields — field types, valid values, Dataverse keys, and GLB model references. It mirrors the Dataverse / Power Pages form. When adding a new addition field, add it here only; `AdditionsForm` is config-driven.

Sided fields store `{ l: value, r: value }`. In PAIR mode both sides are always equal. In LEFT_RIGHT mode they are independent. In LEFT/RIGHT mode only the relevant side is written.

### Design tokens

Defined in `src/app/globals.css` via Tailwind v4 `@theme {}`:
- `text-gold` / `bg-gold` / `border-gold` → `#B8975A`
- `bg-gold-dark` → `#9A7A42`
- `var(--shadow-card)` — layered box-shadow used on all cards
- Border radius 14px on cards (`rounded-[14px]`)

### i18n

**Fully implemented** across OrderForm, AdditionsForm, Gallery, and ProductDetail. The app supports EN/NL/FR/DE.

#### Translation files
Message files in `messages/*.json` (en/nl/fr/de). Server components use `getTranslations()`, client components use `useTranslations()`.

#### Addition field translations
`src/components/order/additions-config.ts` has `labelNl/labelFr/labelDe` fields for each addition field. Use the helpers in `src/lib/additions-helpers.ts`:
- `getFieldLabel(field, locale)` — returns the translated label for a field
- `getSectionLabel(section, locale)` — returns the translated label for a section
- `translateOptionValue(fieldKey, value, t)` — translates option values using next-intl keys

#### Database-driven filter translations
Closure, type, and construction values are translated via the `translations` table in Supabase:
- `src/lib/filter-translations.ts` provides `translateFilterValueSync(value, locale)` for client-side translation
- The helper caches translations on first load via `preloadFilterTranslations()`
- Used in Gallery tooltips and ProductDetail closure chips

When adding new UI text:
1. Add keys to all 4 message files (en/nl/fr/de)
2. If translating additions fields, add `labelNl/labelFr/labelDe` to additions-config.ts
3. If translating filter values (closure/type/construction), add to the `translations` table in Supabase

### Server Actions

Business logic mutations go in `src/app/actions/`. The pattern is plain async functions marked `'use server'`. API routes (`src/app/api/`) are used only for third-party webhooks or endpoints that need raw `Request`/`Response` (e.g., the Anthropic chat route, Resend email notifications, PDF preview generation).

### Important Implementation Patterns

#### AdditionsForm toggle behavior (LEFT_RIGHT mode)
When clicking a toggle field title to activate both L+R checkboxes simultaneously, use **atomic state updates** to avoid React batching issues:

```typescript
// ❌ Wrong - separate updates may batch incorrectly
updateField(field.key, 'l', newValue)
updateField(field.key, 'r', newValue)

// ✅ Correct - single atomic update
const current = additions[field.key] as SidedVal || { l: false, r: false }
onChange({ ...additions, [field.key]: { ...current, l: newValue, r: newValue } })
```

#### Child field detection
Child fields are identified by `field.conditionalOn` property. Apply visual hierarchy via `ml-6` indentation. In Tab3 and PDF, filter out children whose parent toggle is false.

#### MmInput suffix behavior
Display `value == null ? '' : `${String(value)} mm`` but strip ` mm` before parsing in `onChange` and `onBlur` via `e.target.value.replace(/ mm$/i, '')`. This preserves numeric validation while showing units.

#### PDF generation constraints
- Images require absolute URLs (e.g., `https://piedroportal.vercel.app/...`)
- Avoid Unicode symbols (✓) - not all fonts support them
- Use `showWatermark` prop to distinguish preview from final PDF
- Preview route: `/api/orders/preview` (POST with OrderPdfProps)

## Estado Actual do Projecto

Estado Técnico do Projecto — Piedro Portal
Stack
Next.js 16.2.6 App Router · Supabase (auth + DB + storage) · Tailwind CSS v4 · next-intl v4 · Vercel

O que está feito ✅
Infraestrutura

Routing i18n (EN/NL/FR/DE) via next-intl, locale prefix em todas as rotas
Middleware com auth guard para /orders, /wishlist, /admin
Supabase server/client clients, AuthContext, WishlistContext
Auth

Login (LoginForm) — bug do redirect corrigido hoje (era window.location.href = '/gallery' sem locale; agora window.location.replace(/${locale}/gallery))
Register (RegisterForm)
Galeria

Server component que busca produtos do Supabase
Tabs KIDS/MEN/WOMEN, filtros (closure/type/colour/construction/width/size/search), product cards com hover dourado
Filtros traduzidos (labels + valores de closure/type via DB translations)
Tooltips em ProductCard mostram closure e type traduzidos
Wishlist com badge na navbar
Detalhe do produto (ProductDetail)

Galeria de imagens com loupe magnifier (zoom 2.5×)
Suporte a 2 convenções de naming (.png numeradas / .jpg com underscore)
Auto-play de imagens (slideshow 700ms)
Variantes por closure e cor, agrupamento de constructions por widths partilhadas
Headers de tabelas traduzidos (Info, Sizes, Widths)
Closure chips traduzidos (LACE→Veters/Lacets/Schnürsenkel)
Botão Order condicional: visitante → login, sem company → mensagem pendente (traduzida), com company → order form
Formulário de encomenda (OrderForm + AdditionsForm)

**Tab1: Customer/Product**
- 5 modos de unidade: PAIR / LEFT / RIGHT / LEFT_RIGHT / DIFF_SIZES
- Construction + width filtrados dinamicamente, size chips EU
- Validação antes de avançar para Tab2

**Tab2: Additions**
- Secções colapsáveis (Additions, Upper, Sole, Others) com contador de campos preenchidos
- Suporte a campos laterais (L/R), campos condicionais com indentação visual
- Campos mm com snap ao valor mais próximo, mostram " mm" suffix durante digitação e após blur
- Auto-select de conteúdo ao focar campos de texto preenchidos
- Toggle fields: clicar no título alterna ambos L+R checkboxes simultaneamente
- Rocker Sole Type com `collapse: true` esconde chips não selecionados
- GLB viewer para visualização 3D (quando aplicável)
- SAVE DRAFT disponível no topo e em baixo

**Tab3: Confirmation**
- Resumo completo: Customer card (com foto do produto ampliada + shadow), Specifications (construction/width/size), Additions agrupadas por secção
- Parent toggles aparecem como headers dos filhos condicionais
- Standalone toggles (Others) mostram apenas o nome, sem "Yes"
- Valores mm incluem " mm" suffix, alinhados à direita
- Preview PDF com watermark "NOT CONFIRMED" (2 linhas)
- Todos os labels e valores traduzidos em EN/NL/FR/DE
- Submit final com confirmação traduzida

**PDF generation**
- API route `/api/orders/preview` para preview com watermark
- PDF final via email action (sem watermark)
- Header com logo Piedro + tagline "always one step ahead"
- Foto do produto ampliada, product info no customer card
- Child fields indentados, valores mm com " mm" suffix, colunas alinhadas à direita
- Checkmarks customizados em toggle fields (não usa Unicode ✓)
Lista de encomendas (OrdersPage)

Métricas clicáveis (Total, Draft, Submitted, Approved, Production, Urgent)
Filtro por status + search full-text + urgent flag
Paginação client-side (50 por página)
Fetch paginado no servidor (blocos de 1000 para evitar limite do Supabase)
Admin

AdminUsers — gestão de utilizadores
/admin/orders — redirect para admins na página de orders
Decisões técnicas importantes
Decisão	Razão
src/middleware.ts em vez de proxy.ts	Turbopack 16.2.6 não invoca proxy.ts em runtime
Hard redirect (window.location.replace) no login	router.replace do App Router não força o servidor a reler cookies Supabase
Fetch paginado em loop no servidor (orders)	Supabase tem limite de rows por query
createServiceClient (service role) nas orders	RLS não bloqueia admins; o cliente anon bloquearia queries cross-company
Additions guardadas como JSONB	Estrutura variável por produto; evita dezenas de colunas
Problemas conhecidos ⚠️
- `/admin/orders` não está implementado — o redirect existe mas a rota/página não foi vista (pode não existir)
- `addsExclude` vem como `(product as any).adds_exclude` — campo não está no tipo Product, sugere que a query no OrderForm não o selecciona
- Sem validação de campos obrigatórios no step 1 antes de avançar — só bloqueia se reference estiver vazio
- Sem feedback de loading na lista de orders (server component, sem skeleton)
- `additions-config.ts`: labelFr/labelDe incompleto em alguns campos (labelNl está completo)
Próximos passos sugeridos
1. `/admin/orders` — implementar vista back-office (gestão de status de encomendas)
2. Página de detalhe de encomenda — ver/editar uma order existente, mudar status
3. Completar `labelFr/labelDe` em `additions-config.ts` (60+ campos) — labelNl está completo
4. Register flow — confirmar que o registo liga correctamente a `profiles` + `companies`
5. Preservar filtros da Gallery no URL (search params) para partilhar links filtrados
6. Adicionar type `adds_exclude` ao tipo `Product` em `src/types/index.ts`
