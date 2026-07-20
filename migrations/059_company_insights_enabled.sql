-- 059 — Company "Additions Insights" entitlement flag.
--
-- Gates the customer-facing Additions Insights dashboard (the shoe heat map of
-- additions per zone, with conformity/outlier monitoring). Piedro staff (Anabela)
-- decide, per company, who gets to see it.
--
-- Default FALSE — this is opt-IN: no company sees Insights until an admin turns
-- it on from /admin/companies/<id>. (Contrast with sees_general_catalogue, which
-- defaults TRUE to preserve existing catalogue behaviour.)
--
-- Run in the Supabase SQL editor BEFORE deploying code that reads the column. The
-- reader (userHasInsights) and the nav gate both tolerate the column being absent
-- (treat as "off"), so deploying code first is safe but shows the feature to no
-- one until this migration runs.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS insights_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN companies.insights_enabled IS
  'Whether this company may see the customer-facing Additions Insights dashboard (shoe heat map + conformity monitoring). Opt-in, toggled by piedro_admin per company.';
