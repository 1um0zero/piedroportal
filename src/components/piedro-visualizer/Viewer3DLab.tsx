'use client';

// Viewer3DLab.tsx — banca de experimentação INTERNA (admin) do visualizador 3D.
// Não faz parte do fluxo de encomenda do cliente. Serve para o Jorge afinar a
// deformação/zonas/bandeiras antes de decidir se/como isto entra no portal.
//
// three.js (~600 KB) só entra AQUI, via next/dynamic ssr:false.

import { useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Adaptations, Foot } from './types';
import { NEUTRAL_ADAPTATIONS } from './types';

const PiedroVisualizer = dynamic(
  () => import('./PiedroVisualizer'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[520px] w-full items-center justify-center rounded-[14px] bg-[#0f1419] text-sm text-stone-400">
        A carregar motor 3D…
      </div>
    ),
  },
);

// GLBs reais das adições pair-by-pair (bucket `products/3d/`). São sapatos/hormas
// completos (~3.2 MB) — servem de modelo BASE. O lado _l/_r deriva do toggle do pé.
// Rota admin, tráfego baixo — carregar raw é aceitável aqui (cf. egress CANON).
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

interface SliderDef {
  key: keyof Omit<Adaptations, 'foot'>;
  label: string;
  min: number;
  max: number;
  color: string;
}

const SLIDERS: SliderDef[] = [
  { key: 'liftMm', label: 'Heel lift', min: 0, max: 50, color: '#ff5d6c' },
  { key: 'forefootWidthMm', label: 'Extra forefoot width', min: 0, max: 20, color: '#3d8bff' },
  { key: 'toeBoxMm', label: 'Toe box', min: 0, max: 18, color: '#ff9f43' },
  { key: 'medialArchMm', label: 'Medial arch', min: 0, max: 15, color: '#2ecc71' },
  { key: 'wedgeMm', label: 'Wedge (− valgus · + varus)', min: -12, max: 12, color: '#b06bff' },
];

export default function Viewer3DLab() {
  const [params, setParams] = useState<Adaptations>({ ...NEUTRAL_ADAPTATIONS });
  const [showZones, setShowZones] = useState(true);
  const [showFlags, setShowFlags] = useState(true);
  const [modelBase, setModelBase] = useState<string>(DEFAULT_MODEL); // '' = demo procedural
  const exportRef = useRef<(() => string) | null>(null);

  // URL do GLB derivada do modelo escolhido + lado do pé (real _l/_r do bucket).
  const activeModel = modelBase
    ? `${GLB_BASE}${modelBase}_${params.foot.toLowerCase()}.glb`
    : undefined;

  const set = (key: keyof Adaptations, value: number | Foot) =>
    setParams((p) => ({ ...p, [key]: value }));

  const reset = () => {
    setParams({ ...NEUTRAL_ADAPTATIONS });
    setModelBase(DEFAULT_MODEL);
  };

  const handleExport = () => {
    const stl = exportRef.current?.();
    if (!stl) return;
    const blob = new Blob([stl], { type: 'model/stl' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `piedro-demo-${params.foot}.stl`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const summary = useMemo(() => {
    const active = SLIDERS.filter((s) => params[s.key] !== 0);
    return active.length
      ? active.map((s) => `${s.label} ${params[s.key]}mm`).join(' · ')
      : 'Sem adaptações';
  }, [params]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Palco 3D */}
      <div>
        <PiedroVisualizer
          params={params}
          model={activeModel}
          showZones={showZones}
          showFlags={showFlags}
          className="h-[520px] w-full overflow-hidden rounded-[14px]"
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
                onClick={() => set('foot', f)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  params.foot === f
                    ? 'border-gold bg-gold text-white'
                    : 'border-stone-200 text-stone-600 hover:border-stone-300'
                }`}
              >
                {f === 'L' ? 'Left' : 'Right'}
              </button>
            ))}
          </div>
        </div>

        {/* Sliders */}
        <div className="space-y-4">
          {SLIDERS.map((s) => (
            <label key={s.key} className="block">
              <span className="mb-1 flex items-center justify-between text-sm text-stone-700">
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ background: s.color }}
                  />
                  {s.label}
                </span>
                <span className="tabular-nums font-medium text-stone-900">
                  {params[s.key]} mm
                </span>
              </span>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={1}
                value={params[s.key]}
                onChange={(e) => set(s.key, Number(e.target.value))}
                className="w-full accent-gold"
              />
            </label>
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
            GLBs reais das adições pair-by-pair (sapato completo). O lado {params.foot === 'L' ? 'esquerdo' : 'direito'} segue o toggle do pé.
          </p>
        </div>

        {/* Ações */}
        <div className="mt-5 flex gap-2 border-t border-stone-100 pt-4">
          <button
            onClick={reset}
            className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-600 hover:border-stone-300"
          >
            Reset
          </button>
          <button
            onClick={handleExport}
            className="flex-1 rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-white hover:bg-gold-dark"
          >
            Export STL
          </button>
        </div>
      </aside>
    </div>
  );
}
