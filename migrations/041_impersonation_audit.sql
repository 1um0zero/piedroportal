-- 041_impersonation_audit.sql
-- Admin "act-as" (impersonation): when an admin uses the portal on behalf of
-- another user to validate that user's real permissions, every audited action
-- must record BOTH who really acted (actor_id) and on whose behalf
-- (impersonated_as). Without this an on-behalf action would be indistinguishable
-- from one the target performed themselves.
alter table public.admin_actions
  add column if not exists impersonated_as uuid references auth.users(id) on delete set null;

comment on column public.admin_actions.impersonated_as is
  'Set when actor_id performed this action while impersonating another user (act-as). NULL for normal admin actions.';
