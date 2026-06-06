# Piedro Portal — Launch Validation Questionnaire

Fill in answers inline (after each `→`). Each maps to a roadmap item. Anything you don't know yet,
mark `?` so we can chase it. Drafted 2026-06-06.

---

## 1. Domain, DNS & hosting
- **Q1.1** What is the production domain, and is it already registered? (e.g. `portal.piedro.com`)
  → atualmente está associado a portal.piedro.pt, mas chega-se ao portal atual através de um link em piedro.com, portanto: piedro.pt tem se ser ajustado e eles têm de ajustar o link no site deles, depois vou querer configurar o piedro.com para redirecionar para cá 
- **Q1.2** Who controls the DNS for that domain (registrar name / Cloudflare / Piedro IT)? Can you add
  records this weekend?
  → respondi acima, no piedro.pt eu controlo e posso colocar um redirecionador no power pages para mandar para cá tudo o que chegar lá, até me podes ajudar a fazer isso
- **Q1.3** When you said "DDNS to update" — what exactly? Is there an on-prem machine (the a-shell/ERP
  host?) behind a dynamic IP that needs a DDNS updater, or did you mean the portal's DNS records?
  → esquece isto, já respondi acima
- **Q1.4** Keep the old Power Pages URL alive as a redirect to the new portal, or take it down?
  → vou mantê-la viva mas em background para validar dados importados e, até encomendas, aliás, importante: os PDF que existam lá têm de ser importados e associado o novo esquema de link seguro (é meio out of topic, mas é para não me esquecer de te dizer isto)

## 2. Environment & region
- **Q2.1** Are these set in **Vercel production** env (yes/no each): Supabase URL + anon + service key,
  `RESEND_API_KEY`, `EMAIL_FROM`, `ANTHROPIC_API_KEY`, Dataverse creds?
  → sim
- **Q2.2** Which **region** is the Supabase project in? (must be EU for patient data)
  → ireland (penso eu)

## 3. Data wipe & rebuild
- **Q3.1** Confirm what counts as **test data** to destroy: orders? test users? test companies?
  Should product images already in the `products` bucket be kept? Wipe all `order-pdfs`?
  → está respondido mais abaixo
- **Q3.2** Which of migrations **001–005** have already been run in the **production** Supabase?
  → está tudo feito
- **Q3.3** Portal-only data that is NOT in Dataverse and must be re-created after rebuild: which
  **branches** exist, which **exclusive labels** map to which companies, and who is **company_admin**?
  → acho que já respondi mais abaixo
- **Q3.4** Is it safe to assume Dataverse GUIDs stay the primary keys (so re-imports are idempotent)?
  → acho que sim

## 4. User migration
- **Q4.1** How do we know **which contact is the company_admin** of each clinic? (a Dataverse field?
  web role? primary contact? you tell me per account?)
  → é selecionado por um admin na ficha do company
- **Q4.2** What to do with contacts that have **no email** or share an email with another contact?
  → não é suposto haver users sem email porque no power platform era obrigatório no login e não permitia repetidos, se aparecer algum nessas circunstâncias reporta 
- **Q4.3** Do you want migrated old orders **linked back to their user** (backfill `orders.user_id`),
  or is company-level linkage enough?
  → quero **linked back to their user** 
- **Q4.4** Who needs **`piedro_admin`** (full back-office) and who needs **`branch_staff`** accounts,
  and for which branches?
  → ?????
- **Q4.5** Roughly how many users/contacts and how many companies are we migrating?
  → creio que uns 340 users e umas 200 companies

## 5. Email
- **Q5.1** What is the verified Piedro **sending domain/address** for Resend (e.g. `noreply@piedro.com`)?
  Is the domain already verified in Resend?
  → eu tenho de verificar, mas pode começar com piedro.pt e depois vai como piedro.com

## 6. ERP / a-shell integration  ← the part you most want help with
- **Q6.1** Architecture choice: **(A)** portal writes orders back into Dataverse and a-shell stays as
  is; or **(B)** a-shell reads orders directly from the new portal/Supabase (recommended). Which?
  → b) só devemos considerar a) como emergência no caso de não conseguirmos resolver de outra maneira e começar a acumular encomendas online para serem tratadas no ERP 
- **Q6.2** **The flaws in the current Dataverse→a-shell import you want gone.** List them — e.g.
  duplicate imports, wrong/missing additions, manual steps, field mismatches, timing/polling issues,
  encoding, sided L/R confusion, etc.
  → as additions nem sempre são descarregadas e obriga a uma segunda validação e o processo é muito mal desenhado, não tive nenhuma ajuda para a sua implementação, então, basicamente descarrego muita informação e valido do lado do ERP o que torna o processo lento e falível, no sentido contrário, porque o ERP também atualiza o estado de produção no portal, há muitas vezes erros de atualização e nem sei onde está o problema
- **Q6.3** How does a-shell **pull and authenticate** today against the Dataverse API (polling
  interval? OAuth? a specific user?) and can its import code be changed before Monday?
  → eu tenho total controlo sob o código do ERP, a importação é por ordem manual e baseada num token com chamadas html
- **Q6.4** Does a-shell need to **send status back** to the portal (e.g. in production / shipped), or
  is it one-way (portal → ERP)?
  → sim, disse-o acima
- **Q6.5** What is the **minimum order data a-shell needs** to create a production order? (so we design
  a tight export contract instead of dumping everything)
  → não entendi como mínimo, eu quero todas as encomendas registadas e aprovadas com todos os dados
- **Q6.6** Acceptable if, on Monday, ERP gets orders via a **temporary bridge / manual export** while
  the clean integration is finished in week 1? (yes/no)
  → yes

## 7. Customer communication
- **Q7.1** Who announces the new portal, through what channel, and when? (email blast / account
  managers / banner on old portal)
  → vou decidir isso na 2ª feira com a Piedro
- **Q7.2** What's the **support channel** during the first week and who is on call?
  → o staff da Piedro na NL, mas o chat deverá prestar todos os esclarecimentos de utilização
- **Q7.3** Want me to **draft** the customer announcement + first-login instructions in NL/EN/FR/DE?
  → para já não

## 8. Compliance / legal
- **Q8.1** Do you have final content for **Privacy Policy / Terms / Impressum** (currently placeholders)?
  → acho que já me deste tudo o que a Piedro tem de preencher, vou enviar para eles
- **Q8.2** Are **DPAs** in place with Supabase, Vercel, Resend, **Anthropic**? If Anthropic isn't
  covered, should the **in-app chat be disabled** at launch (it sends patient data to the US)?
  → vou garantir isso
- **Q8.3** The compliance docs (`docs/compliance/*`) and legal page texts (`src/lib/legal-info.ts`)
  are **AI-drafted, not certified**. Who is the **DPO / legal counsel** that will review and certify
  them, and is that review booked before Monday? (We cannot publish uncertified legal text.)
  → vou garantir isso

## 9. Operations & risk
- **Q9.1** Is there a **maintenance/freeze window** you can impose on the old portal during cutover?
  → sim
- **Q9.2** Who fixes issues on **Monday** (you, me on standby, Piedro IT)?
  → we all
- **Q9.3** If something goes wrong, is a **soft launch** (limited clinics first) acceptable, or is it
  all-or-nothing on Monday?
  → all-or-nothing

## 10. Scope vs. timeline (the honest one)
- **Q10.1** Given ~2 days, what is the **true must-have** for Monday vs. acceptable as week-1
  fast-follow? Rank: user migration · ERP integration · data rebuild · compliance · comms.
  → vamos fazer o máximo e vai dar certo, mas a ERP integration é o final

## 11. Data import rules (confirm)
- **Q11.1** Confirm "confirmed order" = **`cr56f_step` equals 3** (the import now imports only step 3;
  earlier steps are counted but not imported). Is `3` the right literal value?
  → sim "3" ou numeral 3
- **Q11.2** Confirm the **test client** to exclude is matched by account **name starting with
  "TESTES"** (case-insensitive). Any other test accounts to exclude?
  → name="TESTES*****"
- **Q11.3** (from your Q1.4 note) The **order PDFs already stored in Power Pages/Dataverse** must be
  imported and re-linked to the new private-bucket + signed-URL scheme. Where do they live in
  Dataverse (annotation/note attachments on the order? a SharePoint/blob? a field URL?) so I can
  write the importer?
  → estão no sharepoint, tem uma coluna pdf_link, mas nem todas estão preenchidas, podemos esquecer isto para já
