-- 053: Piedro additions override layer
--
-- Piedro staff who review an order sometimes need to transcribe an amendment the
-- client wrote in the free-text comment into the structured additions (so it
-- reaches the VSI import). We must NOT mutate what the client submitted — the
-- original `additions` (and `comments`) stay untouched as the client's record.
--
-- Instead we keep a SECOND, sparse layer: `additions_override` holds ONLY the
-- fields Piedro added or changed. The VSI export merges it OVER the client
-- additions (override wins per field); everything else falls through unchanged.
-- Client-facing views keep showing the original; the override is staff-only.
--
-- Idempotent. Run in the Supabase SQL editor before deploying the code.

alter table orders add column if not exists additions_override      jsonb;
alter table orders add column if not exists additions_override_note  text;
alter table orders add column if not exists additions_override_by    uuid references auth.users(id);
alter table orders add column if not exists additions_override_at     timestamptz;

comment on column orders.additions_override is
  'Sparse patch of additions edited by Piedro staff (typically transcribed from the client comment). Merged OVER the client additions for the VSI export; the original additions column is never touched. NULL = no override.';
comment on column orders.additions_override_by is 'Staff member who last edited the override layer.';
comment on column orders.additions_override_at is 'When the override layer was last edited.';
