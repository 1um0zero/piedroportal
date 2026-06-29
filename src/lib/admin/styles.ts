import type { createServiceClient } from '@/lib/supabase/service'

type Service = ReturnType<typeof createServiceClient>

/**
 * Keep the `styles` table in lock-step with `products`: every style_name that
 * exists in products must have a styles row, so it shows up in the back-office
 * (/admin/products/styles) ready for its maquette + num_colours. Idempotent —
 * inserts only the missing ones (ON CONFLICT DO NOTHING). Never deletes: a style
 * row holds model-level data (maquette, num_colours) that must survive a colour
 * being removed.
 *
 * Call this right after inserting product rows (single create or bulk import).
 */
export async function ensureStyles(service: Service, styleNames: (string | null | undefined)[]): Promise<void> {
  const names = [...new Set(styleNames.map(s => (s ?? '').trim()).filter(Boolean))]
  if (!names.length) return
  // ON CONFLICT DO NOTHING via upsert with ignoreDuplicates on the PK.
  await service.from('styles').upsert(names.map(style_name => ({ style_name })), {
    onConflict: 'style_name', ignoreDuplicates: true,
  })
}
