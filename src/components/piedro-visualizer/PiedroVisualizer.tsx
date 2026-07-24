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
  /**
   * Deformar a geometria (aproximação paramétrica do Lab). Default: true.
   * `false` = modelo intacto; as adições são só assinaladas (zona + bandeira).
   */
  deform?: boolean;
  /** Classe do contentor (usar tokens Tailwind do portal). */
  className?: string;
  /** Expõe a função de export STL ao pai. */
  onExportReady?: (exportSTL: () => string) => void;
  /** Chamado após o primeiro render. */
  onReady?: () => void;
  /** true enquanto um GLB do catálogo está a descarregar (mostrar loader). */
  onLoadingChange?: (loading: boolean) => void;
}

export default function PiedroVisualizer({
  params,
  model,
  showZones = true,
  showFlags = true,
  deform = true,
  className,
  onExportReady,
  onReady,
  onLoadingChange,
}: PiedroVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<PiedroViewer | null>(null);
  // sentinela ≠ undefined para o 1.º effect distinguir "ainda nada carregado"
  const loadedModelRef = useRef<string | null | undefined>(null);

  // montar / desmontar o motor (uma vez)
  useEffect(() => {
    if (!containerRef.current) return;
    const viewer = new PiedroViewer(containerRef.current, {
      showZones,
      showFlags,
      deform,
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

  // carregar / trocar o modelo do catálogo. O motor já NÃO carrega o demo por
  // omissão — com um GLB real a caminho, o demo aparecia primeiro como uma
  // "aberração" e só depois trocava. O demo entra apenas quando não há modelo.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (model && model !== loadedModelRef.current) {
      loadedModelRef.current = model;
      onLoadingChange?.(true);
      viewer
        .loadModel(model)
        .catch((e) => console.error('[PiedroVisualizer]', e))
        .finally(() => onLoadingChange?.(false));
    } else if (!model && loadedModelRef.current !== undefined) {
      loadedModelRef.current = undefined;
      viewer.loadDemo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
