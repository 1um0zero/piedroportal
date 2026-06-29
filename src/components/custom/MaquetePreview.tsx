// Read-only render of a painted maquette (the proposal captured on an approval
// sheet). Same three-layer technique as MaqueteLeatherPicker, without interaction.
// Server-component-safe (no hooks/handlers) so it can render on the reviewer page.

export type Zone = { id: string; name: string; points: string }
export type Maquete = { id: string; image: string; viewBox: string; silhouette?: string; zones: Zone[] }
export type Leather = { id: number; src: string; name: string }
export type LeatherProposal = { maquete: Maquete; leathers: Leather[]; assign: Record<string, number> }

export default function MaquetePreview({ proposal, width = 600 }: { proposal: LeatherProposal; width?: number }) {
  const { maquete: m, leathers, assign } = proposal
  const leatherOf = (zid: string) => leathers.find(l => l.id === assign[zid]) || null

  return (
    <div className="flex flex-wrap gap-8">
      <div className="relative max-w-full" style={{ width, aspectRatio: '600 / 279' }}>
        <svg viewBox={m.viewBox} className="absolute inset-0 h-full w-full">
          <defs>
            {leathers.map(l => (
              <pattern key={l.id} id={`pp-${m.id}-${l.id}`} patternUnits="userSpaceOnUse" width="120" height="120">
                <image href={l.src} x="0" y="0" width="120" height="120" preserveAspectRatio="xMidYMid slice" />
              </pattern>
            ))}
            {m.silhouette && <clipPath id={`psil-${m.id}`}><polygon points={m.silhouette} /></clipPath>}
          </defs>
          <g clipPath={m.silhouette ? `url(#psil-${m.id})` : undefined}>
            {m.zones.map(z => {
              const lid = assign[z.id]
              return <polygon key={z.id} points={z.points}
                fill={lid != null ? `url(#pp-${m.id}-${lid})` : '#ffffff'} />
            })}
          </g>
        </svg>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={m.image} alt={`maquette ${m.id}`}
          className="pointer-events-none absolute inset-0 h-full w-full" style={{ mixBlendMode: 'multiply' }} />
      </div>

      {/* Piece → leather legend */}
      <div className="w-64">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold">Peças</h3>
        <ul className="space-y-1.5">
          {m.zones.map((z, i) => {
            const l = leatherOf(z.id)
            return (
              <li key={z.id} className="flex items-center gap-2 rounded-lg border border-stone-200 px-2 py-1.5 text-sm">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-100 text-[10px] text-stone-500">{i + 1}</span>
                <span className="flex-1 text-stone-700">{z.name}</span>
                {l
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={l.src} alt={l.name} className="h-6 w-6 rounded object-cover" />
                  : <span className="text-[11px] text-stone-300">—</span>}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
