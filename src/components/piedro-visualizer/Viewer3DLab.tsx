'use client';

// Viewer3DLab.tsx — banca de experimentação INTERNA (admin) do visualizador 3D.
// Não faz parte do fluxo de encomenda do cliente. Os controlos são gerados a
// partir de REFLECT_FIELDS (adições CUSTOM com tradução geométrica).
//
// three.js (~600 KB) só entra AQUI, via next/dynamic ssr:false.

import { useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Foot, ViewerState } from './types';
import { REFLECT_FIELDS, REFLECT_SECTIONS } from './reflect-fields';

const PiedroVisualizer = dynamic(
  () => import('./PiedroVisualizer'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[560px] w-full items-center justify-center rounded-[14px] bg-[#0f1419] text-sm text-stone-400">
        A carregar motor 3D…
      </div>
    ),
  },
);

// GLBs reais das adições pair-by-pair (bucket `products/3d/`). Sapatos/hormas
// completos (~3.2 MB) — servem de modelo BASE. Lado _l/_r deriva do toggle do pé.
const GLB_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/3d/`;

const MODELS: { base: string; label: string }[] = [
  { base: 'width_cone', label: 'Extra width (cone)' },
  { base: 'toe_box', label: 'Toe box' },
  { base: 'depth_forefoot', label: 'Depth forefoot' },
  { base: 'depth_plantair', label: 'Depth plantair' },
  { base: 'hammer_toe', label: 'Hammer toe' },
  { base: 'bunionette', label: 'Bunionette' },
  { base: 'hallux_valgus', label: 'Hallux valgus' },
  { base: 'joint_medial', label: 'Joint medial' },
  { base: 'joint_lateral', label: 'Joint lateral' },
  { base: 'heel_medial', label: 'Heel medial' },
  { base: 'heel_lateral', label: 'Heel lateral' },
  { base: 'heel_depth', label: 'Heel depth' },
  { base: 'heel_exostosis', label: 'Haglund (heel exostosis)' },
  { base: 'straighten_heel', label: 'Straighten heel' },
  { base: 'ankle_medial', label: 'Ankle medial' },
  { base: 'ankle_lateral', label: 'Ankle lateral' },
];

const DEFAULT_MODEL = 'width_cone';

export default function Viewer3DLab() {
  const [foot, setFoot] = useState<Foot>('L');
  const [values, setValues] = useState<Record<string, number>>({});
  const [showZones, setShowZones] = useState(true);
  const [showFlags, setShowFlags] = useState(true);
  const [modelBase, setModelBase] = useState<string>(DEFAULT_MODEL); // '' = demo procedural
  const exportRef = useRef<(() => string) | null>(null);

  const activeModel = modelBase
    ? `${GLB_BASE}${modelBase}_${foot.toLowerCase()}.glb`
    : undefined;

  const params: ViewerState = useMemo(() => ({ foot, values }), [foot, values]);

  const setVal = (key: string, value: number) =>
    setValues((v) => ({ ...v, [key]: value }));

  const reset = () => {
    setValues({});
    setModelBase(DEFAULT_MODEL);
  };

  const handleExport = () => {
    const stl = exportRef.current?.();
    if (!stl) return;
    const blob = new Blob([stl], { type: 'model/stl' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `piedro-demo-${foot}.stl`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const activeCount = useMemo(
    () => REFLECT_FIELDS.filter((f) => (values[f.key] ?? 0) !== 0).length,
    [values],
  );

  const summary = useMemo(() => {
    const active = REFLECT_FIELDS.filter((f) => (values[f.key] ?? 0) !== 0);
    return active.length
      ? active.map((f) => `${f.label} ${values[f.key]}mm`).join(' · ')
      : 'Sem adaptações';
  }, [values]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      {/* Palco 3D */}
      <div>
        <PiedroVisualizer
          params={params}
          model={activeModel}
          showZones={showZones}
          showFlags={showFlags}
          className="h-[560px] w-full overflow-hidden rounded-[14px]"
          onExportReady={(fn) => (exportRef.current = fn)}
        />
        <p className="mt-3 text-xs text-stone-500">{summary}</p>
      </div>

      {/* Painel de controlo */}
      <aside className="rounded-[14px] bg-white p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
        {/* Pé */}
        <div className="mb-5">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-stone-400">
            Foot
          </span>
          <div className="flex gap-2">
            {(['L', 'R'] as Foot[]).map((f) => (
              <button
                key={f}
                onClick={() => setFoot(f)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  foot === f
                    ? 'border-gold bg-gold text-white'
                    : 'border-stone-200 text-stone-600 hover:border-stone-300'
                }`}
              >
                {f === 'L' ? 'Left' : 'Right'}
              </button>
            ))}
          </div>
        </div>

        {/* Adições refletíveis, agrupadas por secção */}
        <div className="max-h-[46vh] space-y-5 overflow-y-auto pr-1">
          {REFLECT_SECTIONS.map((section) => (
            <div key={section}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold">{section}</h3>
              <div className="space-y-3.5">
                {REFLECT_FIELDS.filter((f) => f.section === section).map((f) => (
                  <label key={f.key} className="block">
                    <span className="mb-1 flex items-center justify-between text-sm text-stone-700">
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ background: `#${f.color.toString(16).padStart(6, '0')}` }}
                        />
                        {f.label}
                      </span>
                      <span className="tabular-nums font-medium text-stone-900">
                        {values[f.key] ?? 0} {f.unit ?? 'mm'}
                      </span>
                    </span>
                    <input
                      type="range"
                      min={f.min}
                      max={f.max}
                      step={1}
                      value={values[f.key] ?? 0}
                      onChange={(e) => setVal(f.key, Number(e.target.value))}
                      className="w-full accent-gold"
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Toggles de apresentação */}
        <div className="mt-5 space-y-2 border-t border-stone-100 pt-4">
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" checked={showZones} onChange={(e) => setShowZones(e.target.checked)} />
            Realçar zonas
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" checked={showFlags} onChange={(e) => setShowFlags(e.target.checked)} />
            Mostrar bandeiras
          </label>
        </div>

        {/* Modelo base */}
        <div className="mt-5 border-t border-stone-100 pt-4">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-stone-400">
            Modelo base
          </span>
          <select
            value={modelBase}
            onChange={(e) => setModelBase(e.target.value)}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
          >
            {MODELS.map((m) => (
              <option key={m.base} value={m.base}>{m.label}</option>
            ))}
            <option value="">Demo procedural</option>
          </select>
          <p className="mt-2 text-xs text-stone-400">
            GLBs reais das adições pair-by-pair (sapato completo). O lado {foot === 'L' ? 'esquerdo' : 'direito'} segue o toggle do pé.
          </p>
        </div>

        {/* Ações */}
        <div className="mt-5 flex items-center gap-2 border-t border-stone-100 pt-4">
          <span className="mr-auto text-xs text-stone-400">{activeCount} ativas</span>
          <button
            onClick={reset}
            className="rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-600 hover:border-stone-300"
          >
            Reset
          </button>
          <button
            onClick={handleExport}
            className="rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-white hover:bg-gold-dark"
          >
            Export STL
          </button>
        </div>
      </aside>
    </div>
  );
}
