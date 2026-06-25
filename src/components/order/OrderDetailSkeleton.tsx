/** Soft loading skeleton for a single order's detail page. Shown instantly by
 *  Next.js (route-level loading.tsx) the moment the user opens an order, so the
 *  click always gets immediate feedback while the server fetches. */
export default function OrderDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-6 animate-pulse">
      {/* back link */}
      <div className="h-3 w-24 bg-stone-100 rounded mb-6" />

      {/* header card: product photo + identity */}
      <div className="bg-white rounded-[14px] p-6 mb-5 flex items-center gap-5" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="h-20 w-20 bg-stone-100 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2.5">
          <div className="h-4 w-1/3 bg-stone-100 rounded" />
          <div className="h-3 w-1/4 bg-stone-100 rounded" />
          <div className="h-3 w-1/5 bg-stone-100 rounded" />
        </div>
        <div className="h-7 w-24 bg-stone-100 rounded-full" />
      </div>

      {/* spec + additions blocks */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-[14px] p-6 mb-5" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="h-3 w-28 bg-stone-100 rounded mb-4" />
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={j} className="flex justify-between">
                <div className="h-2.5 w-1/3 bg-stone-100 rounded" />
                <div className="h-2.5 w-1/4 bg-stone-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
