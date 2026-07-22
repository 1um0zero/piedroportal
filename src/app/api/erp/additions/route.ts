import { NextResponse } from 'next/server'
import { isErpAuthorized } from '@/lib/erp/auth'
import {
  buildAdditionsCatalog,
  additionsCatalogHash,
  ADDITIONS_CATALOG_VERSION,
} from '@/lib/erp/additions-catalog'

export const dynamic = 'force-dynamic'

/**
 * GET /api/erp/additions — the a-shell / VSI side (dsv) pulls the canonical
 * catalog of EVERY addition the portal knows about, to map each `key` onto an
 * A-Shell field/slot. Generated live from the form config, so it never drifts.
 *
 * Auth: Authorization: Bearer <ERP_API_TOKEN>
 *
 * Query params:
 *   channel=osb|custom   filter to one channel (default: both)
 *   hash_only=1          return just { catalog_version, hash, count } — cheap
 *                        "did anything change?" poll before pulling the full list
 *
 * Response: { catalog_version, hash, generated_at, count, additions[] }.
 * Each addition: { channel, section, key, type, side, parent, values, unit,
 *                  dataverse_key, labels{en,nl,fr,de} }.
 * The `key` is exactly the `field` emitted by /api/erp/orders → map on it.
 *
 * See docs/erp/ADDITIONS-FOR-DSV.md for the human guide + CHANGELOG (what's new).
 */
export async function GET(req: Request) {
  if (!isErpAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const channel = url.searchParams.get('channel')
  const hashOnly = url.searchParams.get('hash_only') === '1'

  let additions = buildAdditionsCatalog()
  if (channel === 'osb' || channel === 'custom') {
    additions = additions.filter(a => a.channel === channel)
  }
  const hash = additionsCatalogHash()   // hash of the FULL catalog (channel-independent)

  if (hashOnly) {
    return NextResponse.json({
      catalog_version: ADDITIONS_CATALOG_VERSION,
      hash,
      count: additions.length,
    })
  }

  return NextResponse.json({
    catalog_version: ADDITIONS_CATALOG_VERSION,
    hash,
    generated_at: new Date().toISOString(),
    count: additions.length,
    additions,
  })
}
