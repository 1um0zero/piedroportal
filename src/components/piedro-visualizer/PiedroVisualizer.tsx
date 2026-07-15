'use client';

// PiedroVisualizer.tsx — Client Component "controlado".
// Recebe o estado (pé + valores) por props e sincroniza com o motor three.js.
// Não tem estado próprio.

import { useEffect, useRef } from 'react';
import { PiedroViewer } from './engine';
import type { ViewerState } from './types';

export interface PiedroVisualizerProps {
  /** Estado a representar (vem do painel / formulário). */
  params: ViewerState;
  /** URL do GLB do catálogo. Se omitido, mostra o modelo demo. */
  model?: string;
  /** Colorir zonas ativas. Default: true. */
  showZones?: boolean;
  /** Mostrar bandeiras/alfinetes. Default: true. */
  showFlags?: boolean;
  /** Classe do contentor (usar tokens Tailwind do portal). */
  className?: string;
  /** Expõe a função de export STL ao pai. */
  onExportReady?: (exportSTL: () => string) => void;
  /** Chamado após o primeiro render. */
  onReady?: () => void;
}

export default function PiedroVisualizer({
  params,
  model,
  showZones = true,
  showFlags = true,
  className,
  onExportReady,
  onReady,
}: PiedroVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<PiedroViewer | null>(null);
  const loadedModelRef = useRef<string | undefined>(undefined);

  // montar / desmontar o motor (uma vez)
  useEffect(() => {
    if (!containerRef.current) return;
    const viewer = new PiedroViewer(containerRef.current, {
      showZones,
      showFlags,
      onReady,
    });
    viewerRef.current = viewer;
    onExportReady?.(() => viewer.exportSTL());

    return () => {
      viewer.dispose();
      viewerRef.current = null;
    };
    // instanciar apenas uma vez; atualizações vão pelos effects abaixo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // carregar / trocar o modelo do catálogo
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (model && model !== loadedModelRef.current) {
      loadedModelRef.current = model;
      viewer.loadModel(model).catch((e) => console.error('[PiedroVisualizer]', e));
    } else if (!model && loadedModelRef.current) {
      loadedModelRef.current = undefined;
      viewer.loadDemo();
    }
  }, [model]);

  // sincronizar parâmetros
  useEffect(() => {
    viewerRef.current?.setParams(params);
  }, [params]);

  // sincronizar opções de apresentação
  useEffect(() => {
    viewerRef.current?.setOptions({ showZones, showFlags });
  }, [showZones, showFlags]);

  return <div ref={containerRef} className={className} />;
}
