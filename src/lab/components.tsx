'use client'

// ─────────────────────────────────────────────────────────────────────────────
// LAB registry · COMPONENTS. Maps (labKey, optKey) → the live widget to render.
// Keys mirror `registry.ts` (LAB_META). Used by the playground and approval sheets.
// ─────────────────────────────────────────────────────────────────────────────

import { MmSlider, MmHint, MmStepper, MmDatalist, MmFloatingSlider } from './widgets/mm-fields'

type CompMap = Record<string, React.ComponentType>

export const LAB_COMPONENTS: Record<string, CompMap> = {
  'mm-fields': {
    floating: MmFloatingSlider,
    hint:     MmHint,
    slider:   MmSlider,
    stepper:  MmStepper,
    datalist: MmDatalist,
  },
}

/** Render the live widget for a (labKey, optKey); null if unknown. */
export function LabOption({ labKey, optKey }: { labKey: string; optKey: string }) {
  const Comp = LAB_COMPONENTS[labKey]?.[optKey]
  if (!Comp) return <p className="text-xs text-stone-400">— sem pré-visualização —</p>
  return <Comp />
}
