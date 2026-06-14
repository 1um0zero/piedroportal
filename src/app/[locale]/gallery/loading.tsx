/** Route-level loading skeleton for the gallery — shown while the server
 *  component streams. Mirrors the product-grid layout to avoid layout shift. */
export default function GalleryLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse">
      {/* filter bar placeholder */}
      <div className="h-10 w-full max-w-md bg-stone-100 rounded-xl mb-8" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="rounded-[14px] overflow-hidden bg-white" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="aspect-square bg-stone-100" />
            <div className="p-3 space-y-2">
              <div className="h-3 w-2/3 bg-stone-100 rounded" />
              <div className="h-3 w-1/2 bg-stone-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
