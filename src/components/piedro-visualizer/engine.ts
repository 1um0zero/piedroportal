// engine.ts — motor 3D do visualizador PiedroPortal (TypeScript puro, sem React)
//
// Cena three.js, modelo demo procedimental, carregamento de GLB/GLTF/STL/OBJ
// (reorientar + normalizar a 270 mm), deformação paramétrica CONFIG-DRIVEN
// (percorre REFLECT_FIELDS), realce por zonas (vertex colors), bandeiras com
// deteção de lado oculto e export STL.
//
// ⚠ PROTÓTIPO INTERNO: a deformação é uma APROXIMAÇÃO por janelas normalizadas
// (não calibrada por SKU) — ilustra, não representa o produto fabricado.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';

import { ViewerOptions, ViewerState } from './types';
import { REFLECT_FIELDS, ReflectField } from './reflect-fields';

const LENGTH_MM = 270; // comprimento normalizado do modelo

interface MeshRecord {
  mesh: THREE.Mesh;
  geo: THREE.BufferGeometry;
  posAttr: THREE.BufferAttribute;
  colorAttr: THREE.BufferAttribute;
  orig: Float32Array; // posições originais em coords do mundo
  norm: { tx: Float32Array; ny: Float32Array; nz: Float32Array };
}

interface FlagAnchor {
  pos: THREE.Vector3;
  color: number;
  text: string;
  el: HTMLDivElement;
  occluded: boolean; // do lado oculto face à câmara
}

// helpers de perfil (modelo demo)
const bump = (t: number, c: number, w: number) => {
  const x = (t - c) / w;
  return Math.max(0, 1 - x * x);
};
const smooth = (a: number, b: number, t: number) => {
  t = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
// janela suave 0..1 dentro de [a,b] com pico ao centro
const win = (t: number, a: number, b: number) => {
  if (t < a || t > b) return 0;
  return Math.sin(Math.PI * ((t - a) / (b - a)));
};

export class PiedroViewer {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private modelGroup: THREE.Group;
  private grid: THREE.GridHelper;

  private flagLayer: HTMLDivElement;
  private flagSvg: SVGSVGElement;

  private records: MeshRecord[] = [];
  private soleSlab: THREE.Mesh | null = null;
  private flagAnchors: FlagAnchor[] = [];
  private flipLen = false;
  private modelMaxY = 0;

  private state: ViewerState = { foot: 'L', values: {} };
  private opts: Required<Omit<ViewerOptions, 'onReady'>> & { onReady?: () => void };

  private raf = 0;
  private disposed = false;
  private readonly onResize = () => this.resize();

  // oclusão / bandeiras
  private raycaster = new THREE.Raycaster();
  private tmpDir = new THREE.Vector3();
  private tmpTop = new THREE.Vector3();
  private pv = new THREE.Vector3();
  private lastCamPos = new THREE.Vector3(Infinity, 0, 0);
  private occlusionDirty = true;

  constructor(container: HTMLElement, options: ViewerOptions = {}) {
    this.container = container;
    this.opts = {
      showZones: options.showZones ?? true,
      showFlags: options.showFlags ?? true,
      background: options.background ?? 0x0f1419,
      onReady: options.onReady,
    };

    // garantir contexto de posicionamento para o overlay
    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }

    const w = container.clientWidth || 640;
    const h = container.clientHeight || 480;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.opts.background);

    this.camera = new THREE.PerspectiveCamera(42, w / h, 1, 5000);
    this.camera.position.set(320, 220, 360);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.domElement.style.display = 'block';
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 60, 0);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x33404d, 0.85));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(200, 400, 300);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(-250, 150, -200);
    this.scene.add(fill);

    this.grid = new THREE.GridHelper(1200, 24, 0x2a3542, 0x1c242e);
    this.scene.add(this.grid);

    this.modelGroup = new THREE.Group();
    this.scene.add(this.modelGroup);

    // overlay das bandeiras
    this.flagSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    Object.assign(this.flagSvg.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '5',
    } as CSSStyleDeclaration);
    container.appendChild(this.flagSvg);

    this.flagLayer = document.createElement('div');
    Object.assign(this.flagLayer.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '6',
    } as CSSStyleDeclaration);
    container.appendChild(this.flagLayer);

    window.addEventListener('resize', this.onResize);

    this.loadDemo();
    this.animate();
    this.opts.onReady?.();
  }

  // ---------------------------------------------------------------------------
  // API pública
  // ---------------------------------------------------------------------------

  setParams(next: ViewerState): void {
    this.state = { foot: next.foot, values: { ...next.values } };
    this.applyDeformations();
  }

  setOptions(next: Partial<ViewerOptions>): void {
    if (next.showZones !== undefined) this.opts.showZones = next.showZones;
    if (next.showFlags !== undefined) this.opts.showFlags = next.showFlags;
    this.applyDeformations();
  }

  /** Inverte a orientação frente/trás (caso o GLB venha ao contrário). */
  flipLength(): void {
    this.flipLen = !this.flipLen;
    this.applyDeformations();
  }

  /** Carrega o modelo demo procedimental. */
  loadDemo(): void {
    this.flipLen = false;
    const geo = this.buildDemoGeometry();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xd8dee6,
      roughness: 0.65,
      metalness: 0.02,
      vertexColors: true,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const group = new THREE.Group();
    group.add(mesh);
    this.setModel(group);
  }

  /** Carrega um GLB/GLTF/STL/OBJ a partir de URL (catálogo) ou File (upload). */
  async loadModel(source: string | File): Promise<void> {
    const url = typeof source === 'string' ? source : URL.createObjectURL(source);
    const name = (typeof source === 'string' ? source : source.name).toLowerCase();
    const revoke = () => {
      if (typeof source !== 'string') URL.revokeObjectURL(url);
    };
    try {
      if (name.endsWith('.glb') || name.endsWith('.gltf')) {
        const gltf = await new GLTFLoader().loadAsync(url);
        this.setModel(gltf.scene);
      } else if (name.endsWith('.stl')) {
        const geo = await new STLLoader().loadAsync(url);
        const mesh = new THREE.Mesh(
          geo,
          new THREE.MeshStandardMaterial({ color: 0xd8dee6, roughness: 0.7 }),
        );
        const g = new THREE.Group();
        g.add(mesh);
        this.setModel(g);
      } else if (name.endsWith('.obj')) {
        const obj = await new OBJLoader().loadAsync(url);
        this.setModel(obj);
      } else {
        throw new Error('Formato não suportado: ' + name);
      }
    } finally {
      revoke();
    }
  }

  /** Devolve o STL (ASCII) do modelo deformado atual. */
  exportSTL(): string {
    return new STLExporter().parse(this.modelGroup);
  }

  /** Liberta recursos e remove o DOM criado. Chamar no unmount. */
  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    this.controls.dispose();
    this.renderer.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    this.renderer.domElement.remove();
    this.flagSvg.remove();
    this.flagLayer.remove();
  }

  // ---------------------------------------------------------------------------
  // Modelo demo
  // ---------------------------------------------------------------------------

  private buildDemoGeometry(): THREE.BufferGeometry {
    const NL = 70;
    const NR = 28;
    const positions: number[] = [];
    const indices: number[] = [];
    const widthAt = (t: number) =>
      22 + 45 * Math.sin(Math.PI * Math.min(1, t * 1.12)) * (0.55 + 0.45 * smooth(0.35, 0.8, t));
    const heightAt = (t: number) => 12 + 70 * bump(t, 0.42, 0.55) + 30 * bump(t, 0.15, 0.5);

    for (let i = 0; i <= NL; i++) {
      const t = i / NL;
      const cx = (t - 0.5) * LENGTH_MM;
      const wid = widthAt(t);
      const hei = Math.max(8, heightAt(t));
      for (let j = 0; j <= NR; j++) {
        const phi = (j / NR) * Math.PI * 2;
        let y = Math.sin(phi) * hei;
        const zz = Math.cos(phi) * wid;
        if (y < 0) y *= 0.06; // achata a base -> parece sola
        positions.push(cx, y, zz);
      }
    }
    const ring = NR + 1;
    for (let i = 0; i < NL; i++) {
      for (let j = 0; j < NR; j++) {
        const a = i * ring + j;
        const b = a + 1;
        const c = a + ring;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }

  // ---------------------------------------------------------------------------
  // Carregar + normalizar + registar malhas
  // ---------------------------------------------------------------------------

  /** Liberta as geometrias/materiais do modelo anterior (evita fuga GPU ao trocar). */
  private disposeCurrentModel(): void {
    this.modelGroup.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    if (this.soleSlab) {
      this.soleSlab.geometry.dispose();
      (this.soleSlab.material as THREE.Material).dispose();
      this.soleSlab = null;
    }
  }

  private setModel(object: THREE.Object3D): void {
    this.disposeCurrentModel();
    this.modelGroup.clear();
    this.records = [];
    this.soleSlab = null;
    this.modelGroup.add(object);

    const meshes: THREE.Mesh[] = [];
    object.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.geometry) meshes.push(m);
    });

    // reorientar: eixo mais longo -> X
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    box.getSize(size);
    const axes: [('x' | 'y' | 'z'), number][] = [
      ['x', size.x],
      ['y', size.y],
      ['z', size.z],
    ];
    axes.sort((a, b) => b[1] - a[1]);
    const longAxis = axes[0][0];
    if (longAxis === 'y') object.rotation.z = Math.PI / 2;
    else if (longAxis === 'z') object.rotation.y = Math.PI / 2;
    object.updateMatrixWorld(true);

    // normalizar a 270 mm
    const box2 = new THREE.Box3().setFromObject(object);
    const size2 = new THREE.Vector3();
    box2.getSize(size2);
    object.scale.setScalar(LENGTH_MM / (size2.x || 1));
    object.updateMatrixWorld(true);

    // centrar X/Z, assentar base em y=0
    const box3 = new THREE.Box3().setFromObject(object);
    const c3 = new THREE.Vector3();
    box3.getCenter(c3);
    object.position.x -= c3.x;
    object.position.z -= c3.z;
    object.position.y -= box3.min.y;
    object.updateMatrixWorld(true);

    // registar malhas
    const gb = new THREE.Box3().setFromObject(object);
    const gmin = gb.min.clone();
    const gsize = new THREE.Vector3();
    gb.getSize(gsize);

    for (const mesh of meshes) {
      const geo = mesh.geometry as THREE.BufferGeometry;
      if (!geo.attributes.position) continue;
      geo.computeVertexNormals();
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      const n = posAttr.count;

      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        if (m) {
          (m as THREE.MeshStandardMaterial).vertexColors = true;
          m.needsUpdate = true;
        }
      });

      if (!geo.attributes.color) {
        const col = new Float32Array(n * 3).fill(1);
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      }

      const orig = new Float32Array(n * 3);
      const tmp = new THREE.Vector3();
      const norm = {
        tx: new Float32Array(n),
        ny: new Float32Array(n),
        nz: new Float32Array(n),
      };
      for (let i = 0; i < n; i++) {
        tmp.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
        mesh.localToWorld(tmp);
        orig[i * 3] = tmp.x;
        orig[i * 3 + 1] = tmp.y;
        orig[i * 3 + 2] = tmp.z;
        norm.tx[i] = (tmp.x - gmin.x) / (gsize.x || 1);
        norm.ny[i] = (tmp.y - gmin.y) / (gsize.y || 1);
        norm.nz[i] = (tmp.z - (gmin.z + gsize.z / 2)) / (gsize.z / 2 || 1);
      }

      this.records.push({
        mesh,
        geo,
        posAttr,
        colorAttr: geo.attributes.color as THREE.BufferAttribute,
        orig,
        norm,
      });
    }

    this.applyDeformations();
    this.frameCamera();
  }

  private frameCamera(): void {
    const box = new THREE.Box3().setFromObject(this.modelGroup);
    const c = new THREE.Vector3();
    box.getCenter(c);
    const s = new THREE.Vector3();
    box.getSize(s);
    this.controls.target.copy(c);
    const r = Math.max(s.x, s.y, s.z);
    this.camera.position.set(c.x + r * 1.1, c.y + r * 0.9, c.z + r * 1.3);
    this.controls.update();
  }

  // ---------------------------------------------------------------------------
  // Deformação paramétrica (config-driven) + realce por zonas
  // ---------------------------------------------------------------------------

  private medialSign(): number {
    return this.state.foot === 'L' ? 1 : -1;
  }

  private applyDeformations(): void {
    const vals = this.state.values;
    const hl = this.opts.showZones;
    const s = this.medialSign();
    const flip = this.flipLen;

    // campos ativos (valor != 0)
    const active: ReflectField[] = REFLECT_FIELDS.filter((f) => (vals[f.key] ?? 0) !== 0);
    const liftTotal = active
      .filter((f) => f.effect === 'lift')
      .reduce((acc, f) => acc + (vals[f.key] || 0), 0);

    // melhor âncora (ponto de pico) por campo, para a bandeira
    const best: Record<string, { w: number; p: THREE.Vector3 }> = {};
    for (const f of active) best[f.key] = { w: 0, p: new THREE.Vector3() };

    const A = active.length;
    const contrib = new Float64Array(A);

    for (const rec of this.records) {
      const { orig, posAttr, colorAttr, norm, mesh } = rec;
      const n = posAttr.count;
      const w2w = new THREE.Matrix4().copy(mesh.matrixWorld).invert();
      const v = new THREE.Vector3();

      for (let i = 0; i < n; i++) {
        const x = orig[i * 3];
        const y0 = orig[i * 3 + 1];
        const z0 = orig[i * 3 + 2];
        let tx = norm.tx[i];
        if (flip) tx = 1 - tx;
        const ny = norm.ny[i];
        const nz = norm.nz[i] * (flip ? -1 : 1);
        const m = nz * s; // >0 = medial, <0 = lateral

        let dy = 0;
        let dz = 0;
        let colW = 0;
        let colC = 0xffffff;

        for (let k = 0; k < A; k++) {
          const f = active[k];
          const val = vals[f.key] || 0;
          const w = f.effect === 'lift' ? 0 : win(tx, f.a ?? 0, f.b ?? 1);
          let c = 0;
          switch (f.effect) {
            case 'heelRaise':
              dy += val * w;
              c = w;
              break;
            case 'toeSpring':
              dy += val * w;
              c = w;
              break;
            case 'raiseTop': {
              const g = w * Math.max(0, ny);
              dy += val * g;
              c = g;
              break;
            }
            case 'widen': {
              const g = w * (0.5 + 0.5 * Math.abs(nz));
              dz += Math.sign(z0 || 1) * val * g;
              c = w;
              break;
            }
            case 'widenSide': {
              const gate = f.side === 'lateral' ? Math.max(0, -m) : Math.max(0, m);
              const g = w * gate;
              dz += Math.sign(z0 || 1) * val * g;
              dy += val * g * 0.15;
              c = g;
              break;
            }
            case 'wedge': {
              const dir = f.side === 'lateral' ? -1 : 1;
              dy += m * dir * val * 0.5 * w;
              c = Math.max(0, m * dir) * w;
              break;
            }
            case 'arch': {
              const gate = Math.max(0, m) * Math.max(0, 1 - ny);
              const g = w * gate;
              dz -= s * val * g * 0.6;
              dy += val * g * 0.8;
              c = g;
              break;
            }
            case 'lift':
              c = 0;
              break;
          }
          contrib[k] = c;
          if (hl && c > colW) {
            colW = c;
            colC = f.color;
          }
        }

        dy += liftTotal;

        const fx = x;
        const fy = y0 + dy;
        const fz = z0 + dz;

        for (let k = 0; k < A; k++) {
          const rk = best[active[k].key];
          if (contrib[k] > rk.w) {
            rk.w = contrib[k];
            rk.p.set(fx, fy, fz);
          }
        }

        v.set(fx, fy, fz).applyMatrix4(w2w);
        posAttr.setXYZ(i, v.x, v.y, v.z);

        let cr = 1;
        let cg = 1;
        let cb = 1;
        if (hl && colW > 0.08) {
          const col = new THREE.Color(colC);
          const kk = Math.min(0.85, colW);
          cr = 1 - kk + col.r * kk;
          cg = 1 - kk + col.g * kk;
          cb = 1 - kk + col.b * kk;
        }
        colorAttr.setXYZ(i, cr, cg, cb);
      }
      posAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;
      rec.geo.computeVertexNormals();
    }

    this.buildSoleSlab(liftTotal);
    this.buildFlags(active, best, liftTotal);
  }

  private buildSoleSlab(liftTotal: number): void {
    if (this.soleSlab) {
      this.modelGroup.remove(this.soleSlab);
      this.soleSlab.geometry.dispose();
      (this.soleSlab.material as THREE.Material).dispose();
      this.soleSlab = null;
    }
    if (liftTotal <= 0) return;
    const box = new THREE.Box3().setFromObject(this.modelGroup);
    const s = new THREE.Vector3();
    box.getSize(s);
    const c = new THREE.Vector3();
    box.getCenter(c);
    const g = new THREE.BoxGeometry(s.x * 0.98, liftTotal, s.z);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x9aa7b3,
      roughness: 0.8,
      transparent: true,
      opacity: this.opts.showZones ? 0.9 : 0.5,
    });
    this.soleSlab = new THREE.Mesh(g, mat);
    this.soleSlab.position.set(c.x, liftTotal / 2, c.z);
    this.modelGroup.add(this.soleSlab);
  }

  // ---------------------------------------------------------------------------
  // Bandeiras / alfinetes
  // ---------------------------------------------------------------------------

  private buildFlags(
    active: ReflectField[],
    best: Record<string, { w: number; p: THREE.Vector3 }>,
    liftTotal: number,
  ): void {
    this.flagLayer.innerHTML = '';
    this.flagAnchors = [];

    // topo da forma (para o cue de lado oculto)
    const mb = new THREE.Box3().setFromObject(this.modelGroup);
    this.modelMaxY = mb.max.y;

    const vals = this.state.values;
    const items: { pos: THREE.Vector3; color: number; text: string }[] = [];

    for (const f of active) {
      if (f.effect === 'lift') continue; // as bandeiras de lift vão no topo do slab
      const rk = best[f.key];
      if (rk.w > 0) {
        items.push({ pos: rk.p, color: f.color, text: `${f.label} ${vals[f.key]} ${f.unit ?? 'mm'}` });
      }
    }

    // lift(s): âncora no topo do slab, empilhadas
    const lifts = active.filter((f) => f.effect === 'lift');
    if (liftTotal > 0 && this.soleSlab) {
      lifts.forEach((f, idx) => {
        const pos = this.soleSlab!.position.clone();
        pos.y = liftTotal;
        pos.x += (idx - (lifts.length - 1) / 2) * 40;
        items.push({ pos, color: f.color, text: `${f.label} ${vals[f.key]} ${f.unit ?? 'mm'}` });
      });
    }

    for (const it of items) {
      const el = document.createElement('div');
      const hex = '#' + new THREE.Color(it.color).getHexString();
      Object.assign(el.style, {
        position: 'absolute',
        transform: 'translate(-50%,-100%)',
        background: 'rgba(15,20,25,.94)',
        border: '1px solid ' + hex,
        borderRadius: '6px',
        padding: '3px 9px',
        font: '600 11px system-ui,sans-serif',
        color: '#fff',
        whiteSpace: 'nowrap',
        boxShadow: '0 3px 10px rgba(0,0,0,.45)',
      } as CSSStyleDeclaration);
      // texto vem de labels controladas (não de dados do utente) — sem risco XSS.
      // ⚠ NUNCA passar aqui nomes de doentes / texto livre via innerHTML.
      const dot = document.createElement('span');
      Object.assign(dot.style, {
        display: 'inline-block',
        width: '8px',
        height: '8px',
        borderRadius: '2px',
        marginRight: '6px',
        verticalAlign: 'middle',
        background: hex,
      } as CSSStyleDeclaration);
      el.appendChild(dot);
      el.appendChild(document.createTextNode(it.text));
      this.flagLayer.appendChild(el);
      this.flagAnchors.push({ pos: it.pos.clone(), color: it.color, text: it.text, el, occluded: false });
    }
    this.occlusionDirty = true;
    this.updateFlags();
  }

  /** Raio câmara→ponto: se bate na malha ANTES do ponto, está do lado oculto. */
  private isOccluded(pos: THREE.Vector3, meshes: THREE.Mesh[]): boolean {
    this.tmpDir.copy(pos).sub(this.camera.position);
    const dist = this.tmpDir.length();
    if (dist < 2) return false;
    this.tmpDir.normalize();
    this.raycaster.set(this.camera.position, this.tmpDir);
    this.raycaster.near = 0.1;
    this.raycaster.far = dist - 2; // margem: ignora a própria superfície do ponto
    return this.raycaster.intersectObjects(meshes, false).length > 0;
  }

  private updateFlags(): void {
    const show = this.opts.showFlags;
    this.flagLayer.style.display = show ? '' : 'none';
    this.flagSvg.style.display = show ? '' : 'none';
    if (!show) {
      this.flagSvg.innerHTML = '';
      return;
    }
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    // recalcular oclusão só quando a câmara mexe (ou as bandeiras mudam)
    const moved = this.camera.position.distanceToSquared(this.lastCamPos) > 0.25;
    if (moved || this.occlusionDirty) {
      this.lastCamPos.copy(this.camera.position);
      this.occlusionDirty = false;
      const meshes = this.records.map((r) => r.mesh);
      for (const f of this.flagAnchors) f.occluded = this.isOccluded(f.pos, meshes);
    }

    let lines = '';
    this.flagAnchors.forEach((f, i) => {
      this.pv.copy(f.pos).project(this.camera);
      if (this.pv.z > 1 || this.pv.x < -1.3 || this.pv.x > 1.3) {
        f.el.style.display = 'none';
        return;
      }
      f.el.style.display = '';
      const hex = '#' + new THREE.Color(f.color).getHexString();
      const sx = (this.pv.x * 0.5 + 0.5) * w;
      const sy = (-this.pv.y * 0.5 + 0.5) * h;

      if (f.occluded) {
        // ponto no TOPO da forma, por cima da âncora oculta
        this.tmpTop.set(f.pos.x, this.modelMaxY, f.pos.z);
        this.pv.copy(this.tmpTop).project(this.camera);
        const ex = (this.pv.x * 0.5 + 0.5) * w;
        const ey = (-this.pv.y * 0.5 + 0.5) * h;
        const lx = ex;
        const ly = ey - 66 - (i % 3) * 24; // sobe mais a label
        f.el.style.left = lx + 'px';
        f.el.style.top = ly + 'px';
        f.el.style.opacity = '0.72'; // atenuada = lado oculto
        f.el.style.borderStyle = 'dashed';
        // o traço PARA no topo da forma (não entra até ao ponto escondido)
        lines +=
          `<line x1="${ex}" y1="${ey}" x2="${lx}" y2="${ly}" stroke="${hex}" ` +
          `stroke-width="1.5" stroke-dasharray="3 2"/>`;
        // marcador oco = está do outro lado
        lines += `<circle cx="${ex}" cy="${ey}" r="4" fill="none" stroke="${hex}" stroke-width="1.5"/>`;
      } else {
        const lx = sx;
        const ly = sy - 52 - (i % 3) * 24;
        f.el.style.left = lx + 'px';
        f.el.style.top = ly + 'px';
        f.el.style.opacity = '1';
        f.el.style.borderStyle = 'solid';
        lines +=
          `<line x1="${sx}" y1="${sy}" x2="${lx}" y2="${ly}" stroke="${hex}" ` +
          `stroke-width="1.5" stroke-dasharray="3 2"/>`;
        lines += `<circle cx="${sx}" cy="${sy}" r="4.5" fill="${hex}" stroke="#0f1419" stroke-width="1.5"/>`;
      }
    });
    this.flagSvg.innerHTML = lines;
  }

  // ---------------------------------------------------------------------------
  // Loop / resize
  // ---------------------------------------------------------------------------

  private animate = (): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.updateFlags();
  };

  private resize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}
