'use client';

// Custom3DPreview.tsx — modal que mostra as adições GEOMÉTRICAS da encomenda
// CUSTOM aplicadas num sapato 3D. Aberto pelo botão do rodapé (Tab2/Tab3).
//
// Base = sapato demo procedural (neutro, sem adição embutida) para as
// deformações lerem limpo. three.js entra só aqui (next/dynamic ssr:false).

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Foot } from '@/components/piedro-visualizer';
import { customValuesToViewer } from './custom-3d-map';

const PiedroVisualizer = dynamic(
  () => import('@/components/piedro-visualizer').then((m) => m.PiedroVisualizer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center text-sm text-stone-400">
        A carregar motor 3D…
      </div>
    ),
  },
);

export default function Custom3DPreview({
  values,
  unit,
  onClose,
}: {
  values: Record<string, unknown>;
  unit: 'PAIR' | 'LEFT' | 'RIGHT' | 'LEFT_RIGHT';
  onClose: () => void;
}) {
  const [foot, setFoot] = useState<Foot>(unit === 'RIGHT' ? 'R' : 'L');
  const params = useMemo(() => customValuesToViewer(values, foot), [values, foot]);
  const bothFeet = unit === 'PAIR' || unit === 'LEFT_RIGHT';
  const activeCount = Object.keys(params.values).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[86vh] w-full max-w-5xl flex-col overflow-hidden rounded-[14px] bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
          <div>
            <h3 className="text-sm font-semibold text-stone-800">3D preview — additions</h3>
            <p className="text-xs text-stone-400">
              Illustrative — not to the scale of the manufactured product.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {bothFeet && (
              <div className="flex overflow-hidden rounded-lg border border-stone-200 text-sm">
                {(['L', 'R'] as Foot[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFoot(f)}
                    className={`px-3 py-1.5 font-medium ${
                      foot === f ? 'bg-gold text-white' : 'text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    {f === 'L' ? 'Left' : 'Right'}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={onClose}
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-600 hover:border-stone-300"
            >
              Close
            </button>
          </div>
        </div>

        {/* Palco */}
        <div className="relative flex-1 bg-[#0f1419]">
          <PiedroVisualizer params={params} showZones showFlags className="h-full w-full" />
          {activeCount === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="rounded-lg bg-black/60 px-4 py-2 text-sm text-stone-200">
                Ainda não há adições com forma preenchidas neste pé.
              </span>
            </div>
          )}
        </div>

        <div className="border-t border-stone-100 px-5 py-2 text-xs text-stone-400">
          {activeCount} reflectable addition{activeCount === 1 ? '' : 's'} shown · arraste para rodar
        </div>
      </div>
    </div>
  );
}
