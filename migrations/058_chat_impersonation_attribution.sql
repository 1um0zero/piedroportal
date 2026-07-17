-- ============================================================================
-- Migration 058 — attribute assistant activity done under "view as" (act-as)
-- ============================================================================
--
-- Run in the Supabase SQL Editor BEFORE deploying the code that uses it.
--
-- Problem: impersonation swaps the target's REAL Supabase session, so an admin
-- chatting while "viewing as" a client wrote chat_logs / chat_feedback rows that
-- look exactly like the client's own. The client's assistant record — a GDPR
-- subject record — silently gained messages they never sent.
--
-- Fix: mirror the admin_actions convention (migration 036), which already
-- carries both identities on the row. Here the session user stays in `user_id`
-- (that is whose data was in scope, and what consent + retention key on), and
-- `impersonated_by` names the REAL admin behind the keyboard. NULL = the user
-- themselves, which is the case for every existing row.
--
-- Consent itself is NOT made attributable — it is made impossible: an admin can
-- never accept the notice on a user's behalf (enforced in the app, see
-- acceptChatConsent). Nobody consents for someone else.
-- ============================================================================

alter table public.chat_logs
  add column if not exists impersonated_by uuid references auth.users(id);

comment on column public.chat_logs.impersonated_by is
  'Set when this message was exchanged by a Piedro admin acting as (viewing as) user_id. NULL = the user themselves.';

alter table public.chat_feedback
  add column if not exists impersonated_by uuid references auth.users(id);

comment on column public.chat_feedback.impersonated_by is
  'Set when this answer was flagged by a Piedro admin acting as (viewing as) user_id. NULL = the user themselves.';

-- Partial index: the "was this really the user?" question is asked of the few
-- impersonated rows, never of the many normal ones.
create index if not exists chat_logs_impersonated_idx
  on public.chat_logs (impersonated_by, created_at desc)
  where impersonated_by is not null;

-- ============================================================================
-- Verification
-- ============================================================================
-- select count(*) from chat_logs where impersonated_by is not null;  -- 0 before any act-as chat
