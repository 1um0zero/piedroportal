/** Route-level loading skeleton for the orders list — shown while the server
 *  component fetches (the list paginates server-side and can take a beat). */
export default function OrdersLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse">
      {/* metric cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-[14px] px-4 py-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="h-6 w-10 bg-stone-100 rounded mb-2" />
            <div className="h-2.5 w-12 bg-stone-100 rounded" />
          </div>
        ))}
      </div>
      {/* search row */}
      <div className="h-10 w-full max-w-sm bg-stone-100 rounded-xl mb-5" />
      {/* order rows */}
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-[14px] px-5 py-4 flex items-center gap-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="h-10 w-10 bg-stone-100 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 bg-stone-100 rounded" />
              <div className="h-2.5 w-1/4 bg-stone-100 rounded" />
            </div>
            <div className="h-6 w-20 bg-stone-100 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
