-- 044 — Granular capability: let a branch_staff APPROVE orders (set Piedro Order #
-- + approval state) WITHOUT promoting them to piedro_admin.
--
-- Rationale: customerservice@ (and similar VSI/branch operators) must be able to
-- validate/approve orders and stamp the Piedro Order #, but must NOT gain the rest
-- of the back-office (users, companies, products, settings…). This is the same
-- "scope vs permission" split introduced with staff_viewer (043): branch_staff
-- already brings the SCOPE (their model set); this flag adds the WRITE PERMISSION
-- on the orders approval controls, nothing else.
--
-- Idempotent. Defaults to false, so no existing branch_staff gains approval until
-- explicitly toggled in /admin/users.

alter table public.profiles
  add column if not exists can_approve_orders boolean not null default false;

comment on column public.profiles.can_approve_orders is
  'Granular capability: a branch_staff with this flag may approve orders and set the Piedro Order # within their model scope. No effect on other roles (piedro_admin already can; user/company_admin/staff_viewer cannot approve).';
