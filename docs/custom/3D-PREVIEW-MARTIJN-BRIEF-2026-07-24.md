# 3D preview — evaluation brief for Martijn (2026-07-24)

Draft message for Jorge to send (email/Teams, EN). Access is live in production:
`mloonen@piedro.nl` is allowlisted as CUSTOM-beta **evaluator** (form + 3D open;
Save draft / Submit / AI Assist disabled — see `src/lib/custom-beta.ts`).

---

Subject: **3D preview on the custom-made form — worth developing further?**

Hi Martijn,

We built a first working version of a **3D preview** inside the custom-made
order form, and before investing more time in it I'd like your honest opinion
on whether it earns its place.

**What it does**

While filling the Customization tab, a "View in 3D" button opens the shoe in
3D (the real base model, left or right following the order). Every addition
you filled that has a physical location is **marked on the shoe**: the region
is tinted and a small flag shows the addition name and value (e.g. "Heel
raise 12 mm"). You can drag to rotate; flags on the far side of the shoe dim
and point over the top, so you always know something is there.

One deliberate design decision to validate with you: the model's **shape is
never altered**. An earlier attempt "sculpted" the additions into the mesh,
but a generic deformation will always be far from the real manufactured
result — which felt misleading. So the preview answers *"where on the shoe is
each customization, and with which value?"* — not *"what will the shoe look
like?"*.

**How to try it**

1. Log in to the portal as usual (portal.piedro.pt) with your account.
2. Open this link: **https://portal.piedro.pt/gallery/e69b2ffd-cc6a-ef11-a670-6045bd8a033e/custom**
   (model 3467 — but any model works via its gallery page if you append `/custom`).
3. Tab 1: pick any company (your account is in evaluation mode — nothing you
   do here is saved or sent), fill Customer + Reference with anything.
4. Tab 2: fill a few additions that have a shape — e.g. heel height, a
   supplement, a wedge, forefoot width.
5. Press **"View in 3D"** (bottom of Tab 2 or Tab 3). Toggle Left/Right,
   rotate, and see the flags follow.

**The questions**

1. Is this useful in the daily custom-made workflow — for you, and for the
   clinicians who fill the form? Where exactly (while filling? at
   confirmation? in the order PDF)?
2. Is "mark the location, don't change the shape" the right call, or would
   you expect the shoe to visually change?
3. What's missing for it to be genuinely useful (more additions marked,
   different base models per article, colours, anything else)?
4. Bottom line: should we invest more here, or park it?

Nothing you do in the form is saved — feel free to play.

Thanks!
Jorge

---

## Notas internas (não enviar)

- Acesso: allowlist em `src/lib/custom-beta.ts` (`isCustomBetaEvaluator`);
  gate na página CUSTOM + `evaluationOnly` no form (save() é no-op, botões
  substituídos por nota, AI Assist escondido). Server-side continua fail-closed
  (`insertCustomOrderAction` recusa empresa a que não pertence).
- O botão "Custom-made (beta)" na galeria continua admin-only — o Martijn entra
  pelo link direto (qualquer produto: `/gallery/<id>/custom`).
- Se o Jorge quiser dar-lhe também o **AI Assist**, é alargar o gate da rota
  `/api/custom/ai-intake` aos evaluators + remover o `!evaluationOnly` no form
  (custo: tokens por chamada).
- Remover o acesso = apagar o email do Set e fazer deploy.
