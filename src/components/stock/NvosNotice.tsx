// NVOS approval notice for STOCK (Piedro EVO) models and orders.
//
// Per the client (Anabela, 2026-06-13): the EVO stock range is still awaiting
// NVOS approval and Dutch customers must be told. The body is intentionally
// Dutch-only and untranslated — only NL customers need (and can read) it, so a
// short English remark flags the audience instead of localising the message.
export default function NvosNotice({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 ${className}`}
      role="note"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">
        Attention — NL customers
      </p>
      <p className="mt-1 text-sm font-semibold">Keuringsstatus</p>
      <p className="mt-0.5 text-sm leading-relaxed text-amber-800">
        De Piedro EVO schoenen en boots zijn momenteel nog in afwachting van de
        NVOS-keuring. Zodra de keuring is afgerond, informeren wij u hier direct over.
      </p>
    </div>
  )
}
