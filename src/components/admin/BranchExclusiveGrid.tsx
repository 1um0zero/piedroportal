'use client'

import { setBranchColoursExclusive } from '@/app/actions/admin-branches'
import ExclusiveColourGrid, { type GridStyle } from '@/components/admin/ExclusiveColourGrid'

export type { GridColour, GridStyle } from '@/components/admin/ExclusiveColourGrid'

type Props = {
  branchId: string
  token: string
  styles: GridStyle[]
}

/**
 * Style → Colour exclusivity grid for a token-scoped branch (e.g. UK).
 * Thin wrapper that persists toggles via setBranchColoursExclusive (additive).
 */
export default function BranchExclusiveGrid({ branchId, token, styles }: Props) {
  return (
    <ExclusiveColourGrid
      token={token}
      styles={styles}
      onApply={(colourIds, on) => setBranchColoursExclusive(branchId, colourIds, on)}
    />
  )
}
