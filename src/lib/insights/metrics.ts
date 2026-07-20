// ─────────────────────────────────────────────────────────────────────────────
// Additions Insights — metrics engine (pure, no I/O)
//
// Turns a set of orders into the numbers the dashboard renders:
//   • per-ZONE occurrence totals (what paints the shoe heat map)
//   • per-FIELD totals within a zone (the drill-down)
//   • additions-per-order overall and per breakdown group
//   • conformity: which groups (cities / clinicians) deviate from the average
//
// Counting rule (matches the ERP notion of a billable addition and the form's
// `countFilled`): one order contributes ONE occurrence per distinct top-level
// addition field present, regardless of how many feet it applies to. Conditional
// children (e.g. Haglund height under Haglund) are parameters of their parent and
// are NEVER counted separately. Non-anatomical order flags (urgent, no logo…) do
// not paint the shoe and are excluded from the additions totals.
// ─────────────────────────────────────────────────────────────────────────────

import { explodeAdditions } from '@/lib/additions-explode'
import { SHOE_ZONES, zoneForField, type ShoeZone } from './addition-zones'

/** One order, reduced to what the metrics need. `fields` is the list of distinct
 *  top-level anatomical addition field keys present (built once, server-side, via
 *  {@link topLevelFields}); `group` is the breakdown bucket (a location/company or
 *  a clinician) chosen by the caller. Keeping the reduction outside lets the client
 *  re-aggregate by period/axis instantly without re-parsing the additions JSONB. */
export interface InsightOrder {
  fields: string[]
  /** Breakdown bucket this order belongs to (e.g. "Rotterdam" or a clinician). */
  group: string
  /** Human label for the group (e.g. clinician full name); defaults to `group`. */
  groupLabel?: string
  createdAt: string
}

export interface ZoneStat {
  zone: ShoeZone
  count: number                    // total occurrences across the population
  perOrder: number                 // count / orderCount
  /** field key → occurrences, most-frequent first (drill-down within the zone). */
  fields: { field: string; count: number }[]
}

export interface GroupStat {
  group: string
  label: string
  orders: number
  additions: number
  perOrder: number                 // additions per order for this group
  zoneCounts: Record<ShoeZone, number>
  /** True when perOrder exceeds the population baseline by the outlier factor
   *  AND the group has enough orders to be meaningful. */
  outlier: boolean
  /** Signed deviation from baseline, e.g. +0.42 = 42% above the average. */
  deviation: number
  /** Zones where this group individually runs hot vs the baseline per-zone rate. */
  hotZones: ShoeZone[]
}

export interface InsightResult {
  orderCount: number
  additionsTotal: number
  additionsPerOrder: number        // the population baseline
  zones: ZoneStat[]                // ordered by SHOE_ZONES
  zoneMax: number                  // max zone count (for heat normalization)
  groups: GroupStat[]              // ordered by perOrder desc
  outlierFactor: number
  minGroupOrders: number
}

export interface InsightOptions {
  /** A group is "hot" when its per-order rate ≥ baseline × this. Default 1.25. */
  outlierFactor?: number
  /** Ignore groups with fewer orders than this when flagging outliers. Default 5. */
  minGroupOrders?: number
}

/** Distinct top-level (non-child) anatomical addition fields present in one order. */
export function topLevelFields(additions: Record<string, unknown> | null | undefined): string[] {
  const seen = new Set<string>()
  for (const row of explodeAdditions(additions)) {
    if (row.parent !== null) continue          // children are parameters, not additions
    if (zoneForField(row.field) === null) continue  // non-anatomical flags don't paint the shoe
    seen.add(row.field)
  }
  return [...seen]
}

const emptyZoneCounts = (): Record<ShoeZone, number> =>
  SHOE_ZONES.reduce((acc, z) => { acc[z] = 0; return acc }, {} as Record<ShoeZone, number>)

/**
 * Compute the full insight result for a population of orders.
 * Pure: same input → same output, no clock/network (safe to memoize/cache).
 */
export function computeInsights(orders: InsightOrder[], opts: InsightOptions = {}): InsightResult {
  const outlierFactor = opts.outlierFactor ?? 1.25
  const minGroupOrders = opts.minGroupOrders ?? 5

  const zoneCount = emptyZoneCounts()
  const fieldCount = new Map<string, number>()          // field → occurrences (all zones)
  const groups = new Map<string, { label: string; orders: number; additions: number; zoneCounts: Record<ShoeZone, number> }>()

  let additionsTotal = 0

  for (const order of orders) {
    const fields = order.fields

    let g = groups.get(order.group)
    if (!g) {
      g = { label: order.groupLabel ?? order.group, orders: 0, additions: 0, zoneCounts: emptyZoneCounts() }
      groups.set(order.group, g)
    }
    g.orders += 1

    for (const field of fields) {
      const zone = zoneForField(field)
      if (!zone) continue
      zoneCount[zone] += 1
      g.zoneCounts[zone] += 1
      g.additions += 1
      additionsTotal += 1
      fieldCount.set(field, (fieldCount.get(field) ?? 0) + 1)
    }
  }

  const orderCount = orders.length
  const additionsPerOrder = orderCount ? additionsTotal / orderCount : 0

  // Per-zone field breakdown (drill-down), most-frequent first.
  const fieldsByZone = new Map<ShoeZone, { field: string; count: number }[]>()
  for (const [field, count] of fieldCount) {
    const zone = zoneForField(field)
    if (!zone) continue
    const arr = fieldsByZone.get(zone) ?? []
    arr.push({ field, count })
    fieldsByZone.set(zone, arr)
  }
  for (const arr of fieldsByZone.values()) arr.sort((a, b) => b.count - a.count || a.field.localeCompare(b.field))

  const zones: ZoneStat[] = SHOE_ZONES.map(zone => ({
    zone,
    count: zoneCount[zone],
    perOrder: orderCount ? zoneCount[zone] / orderCount : 0,
    fields: fieldsByZone.get(zone) ?? [],
  }))
  const zoneMax = zones.reduce((m, z) => Math.max(m, z.count), 0)

  // Per-zone baseline rates, for detecting a group that runs hot in one region.
  const baselineZonePerOrder = emptyZoneCounts()
  for (const zone of SHOE_ZONES) baselineZonePerOrder[zone] = orderCount ? zoneCount[zone] / orderCount : 0

  const groupStats: GroupStat[] = [...groups.entries()].map(([group, g]) => {
    const perOrder = g.orders ? g.additions / g.orders : 0
    const deviation = additionsPerOrder ? perOrder / additionsPerOrder - 1 : 0
    const eligible = g.orders >= minGroupOrders
    const outlier = eligible && additionsPerOrder > 0 && perOrder >= additionsPerOrder * outlierFactor
    const hotZones = eligible
      ? SHOE_ZONES.filter(z => {
          const base = baselineZonePerOrder[z]
          return base > 0 && (g.zoneCounts[z] / g.orders) >= base * outlierFactor
        })
      : []
    return { group, label: g.label, orders: g.orders, additions: g.additions, perOrder, zoneCounts: g.zoneCounts, outlier, deviation, hotZones }
  }).sort((a, b) => b.perOrder - a.perOrder || b.orders - a.orders)

  return {
    orderCount,
    additionsTotal,
    additionsPerOrder,
    zones,
    zoneMax,
    groups: groupStats,
    outlierFactor,
    minGroupOrders,
  }
}
