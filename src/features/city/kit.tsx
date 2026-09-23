"use client";

// Общие геометрии и материалы сцены: создаются один раз на модуль,
// меши масштабируются через scale. Файл грузится только на клиенте (ssr: false).

import { useLayoutEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  CanvasTexture,
  CapsuleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  FrontSide,
  IcosahedronGeometry,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  RepeatWrapping,
  RingGeometry,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  type BufferGeometry,
  type InstancedMesh,
  type Material,
} from "three";

type Vec3 = [number, number, number];

export const GEO = {
  box: new BoxGeometry(1, 1, 1),
  /** цилиндр радиуса 1 и высоты 1, центр посередине */
  cyl: new CylinderGeometry(1, 1, 1, 24),
  cyl8: new CylinderGeometry(1, 1, 1, 8),
  cone: new ConeGeometry(1, 1, 12),
  cone6: new ConeGeometry(1, 1, 6),
  sphere: new SphereGeometry(1, 16, 12),
  ico: new IcosahedronGeometry(1, 0),
  torus: new TorusGeometry(1, 0.08, 8, 32),
  /** персонаж: радиус 0.35, полная высота 1.7 */
  capsule: new CapsuleGeometry(0.35, 1, 4, 12),
  /** маркер цели клика */
  ring: new RingGeometry(0.45, 0.62, 6),
  /** треугольная призма: основание на y=0, конёк на y=1, ширина по x 1, глубина по z 1 */
  prism: (() => {
    const g = new CylinderGeometry(1, 1, 1, 3);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0.5, 0);
    g.scale(1 / Math.sqrt(3), 1 / 1.5, 1);
    return g;
  })(),
};

const cache = new Map<string, MeshStandardMaterial>();

interface MatOpts {
  emissive?: string;
  intensity?: number;
  double?: boolean;
  flat?: boolean;
  roughness?: number;
  metalness?: number;
}

/** общий материал по цвету; emissive — для подсветки */
export function mat(color: string, opts: MatOpts = {}) {
  const key = `${color}|${opts.emissive ?? ""}|${opts.intensity ?? ""}|${opts.double ? 1 : 0}|${opts.flat === false ? 0 : 1}|${opts.roughness ?? ""}|${opts.metalness ?? ""}`;
  let m = cache.get(key);
  if (!m) {
    m = new MeshStandardMaterial({
      color,
      flatShading: opts.flat !== false,
      roughness: opts.roughness ?? 0.85,
      metalness: opts.metalness ?? 0,
      emissive: opts.emissive ?? "#000000",
      emissiveIntensity: opts.intensity ?? 1,
      side: opts.double ? DoubleSide : FrontSide,
    });
    cache.set(key, m);
  }
  return m;
}

const glassCache = new Map<string, MeshPhysicalMaterial>();

/** стекло фасадов: слегка прозрачное, с отражением окружения; lit — окна горят */
export function glass(color: string, opts: { lit?: boolean; opacity?: number } = {}) {
  const key = `${color}|${opts.lit ? 1 : 0}|${opts.opacity ?? ""}`;
  let m = glassCache.get(key);
  if (!m) {
    m = new MeshPhysicalMaterial({
      color,
      roughness: 0.18,
      metalness: 0.35,
      transparent: true,
      opacity: opts.opacity ?? 0.92,
      envMapIntensity: 1.2,
      emissive: opts.lit ? "#ffcf7a" : "#000000",
      emissiveIntensity: opts.lit ? 0.9 : 0,
      depthWrite: true,
    });
    glassCache.set(key, m);
  }
  return m;
}

export const PALETTE = {
  grass: "#8fbd6e",
  grassFar: "#7fae61",
  road: "#4b4f57",
  roadLine: "#f1e6bf",
  sidewalk: "#d8d3c5",
  curb: "#bcb6a8",
  plaza: "#e9dfc7",
  plazaInner: "#d6c6a3",
  wall: "#f6efe2",
  wallWarm: "#f1e2c8",
  roof: "#c9735a",
  wood: "#8a5a3c",
  dark: "#3d4450",
  glass: "#9fc3dd",
  stone: "#d9d3c7",
  grey: "#b9bcc2",
  greyDark: "#9ea2a9",
  white: "#fbf8f2",
  metal: "#8b9099",
};

interface PartProps {
  /** низ детали по центру; с center — центр детали */
  position?: Vec3;
  rotation?: Vec3;
  /** масштаб единичной геометрии: box — размеры, cyl/cone — [радиус, высота, радиус], sphere/ico — радиусы */
  size: Vec3;
  color?: string;
  material?: Material;
  geo?: keyof typeof GEO;
  emissive?: string;
  intensity?: number;
  shadow?: boolean;
  center?: boolean;
  flat?: boolean;
  roughness?: number;
  metalness?: number;
}

/** примитив с общей геометрией и общим материалом */
export function Part({
  position = [0, 0, 0],
  rotation,
  size,
  color = "#ffffff",
  material,
  geo = "box",
  emissive,
  intensity,
  shadow = true,
  center,
  flat,
  roughness,
  metalness,
}: PartProps) {
  const lift = center || geo === "prism" ? 0 : geo === "sphere" || geo === "ico" ? size[1] : size[1] / 2;
  return (
    <mesh
      geometry={GEO[geo]}
      material={material ?? mat(color, { emissive, intensity, flat, roughness, metalness })}
      position={[position[0], position[1] + lift, position[2]]}
      rotation={rotation}
      scale={size}
      castShadow={shadow}
      receiveShadow
    />
  );
}

export interface Item {
  p: Vec3;
  s: Vec3;
  /** поворот вокруг y */
  r?: number;
  color?: string;
}

/** инстансы одной геометрии и материала: деревья, окна, фонари */
export function Instances({
  geometry,
  material,
  items,
  shadow = true,
}: {
  geometry: BufferGeometry;
  material: Material;
  items: Item[];
  shadow?: boolean;
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new Object3D();
    const c = new Color();
    items.forEach((it, i) => {
      o.position.set(...it.p);
      o.scale.set(...it.s);
      o.rotation.set(0, it.r ?? 0, 0);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      if (it.color) mesh.setColorAt(i, c.set(it.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  if (items.length === 0) return null;
  return <instancedMesh ref={ref} args={[geometry, material, items.length]} castShadow={shadow} receiveShadow />;
}

const textureCache = new Map<string, CanvasTexture>();

/** текстура с текстом (вывески, доски): рисуется на canvas, кириллица без веб-шрифтов */
export function textTexture(
  text: string,
  opts: { bg?: string; fg?: string; width?: number; height?: number; font?: string; sub?: string; align?: "center" | "left" } = {},
) {
  const key = `${text}|${opts.sub ?? ""}|${opts.bg ?? ""}|${opts.fg ?? ""}|${opts.width ?? ""}|${opts.height ?? ""}|${opts.font ?? ""}|${opts.align ?? ""}`;
  let t = textureCache.get(key);
  if (t) return t;
  const w = opts.width ?? 512;
  const h = opts.height ?? 128;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = opts.bg ?? "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = opts.fg ?? "#1c2430";
  ctx.textBaseline = "middle";
  ctx.textAlign = opts.align ?? "center";
  const x = opts.align === "left" ? 24 : w / 2;
  const main = opts.font ?? `600 ${Math.round(h * (opts.sub ? 0.42 : 0.5))}px system-ui, -apple-system, Segoe UI, sans-serif`;
  ctx.font = main;
  let size = parseInt(main.match(/(\d+)px/)?.[1] ?? "48", 10);
  while (ctx.measureText(text).width > w - 48 && size > 12) {
    size -= 2;
    ctx.font = main.replace(/\d+px/, `${size}px`);
  }
  if (opts.sub) {
    ctx.fillText(text, x, h * 0.38);
    ctx.font = `400 ${Math.round(h * 0.24)}px system-ui, -apple-system, Segoe UI, sans-serif`;
    ctx.globalAlpha = 0.85;
    ctx.fillText(opts.sub, x, h * 0.74);
    ctx.globalAlpha = 1;
  } else {
    ctx.fillText(text, x, h / 2);
  }
  t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  textureCache.set(key, t);
  return t;
}

let grassTex: CanvasTexture | null = null;

/** шум для травы: пятна двух зелёных, чтобы поле не было плоским */
export function grassTexture() {
  if (grassTex) return grassTex;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  let seed = 11;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 900; i++) {
    const r = 4 + rand() * 14;
    const v = 0.88 + rand() * 0.16;
    ctx.fillStyle = `rgba(${Math.round(255 * v)}, ${Math.round(255 * (v + 0.02))}, ${Math.round(255 * v)}, 0.55)`;
    ctx.beginPath();
    ctx.ellipse(rand() * size, rand() * size, r, r * (0.5 + rand() * 0.6), rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  grassTex = new CanvasTexture(canvas);
  grassTex.wrapS = grassTex.wrapT = RepeatWrapping;
  grassTex.repeat.set(30, 30);
  grassTex.anisotropy = 4;
  return grassTex;
}

let asphaltTex: CanvasTexture | null = null;

/** лёгкая зернистость асфальта и тротуара */
export function noiseTexture() {
  if (asphaltTex) return asphaltTex;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  let seed = 5;
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (seed * 16807) % 2147483647;
    const v = 235 + (seed % 20);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  asphaltTex = new CanvasTexture(canvas);
  asphaltTex.wrapS = asphaltTex.wrapT = RepeatWrapping;
  asphaltTex.repeat.set(8, 8);
  return asphaltTex;
}

const PLANE = new PlaneGeometry(1, 1);

/** вывеска: цветная табличка с текстом, смотрит на +z */
export function Sign({ text, color, width, height, position }: { text: string; color: string; width: number; height: number; position: [number, number, number] }) {
  const texture = useMemo(() => textTexture(text, { bg: color, fg: "#ffffff", width: 640, height: Math.round((640 * height) / width) }), [text, color, width, height]);
  return (
    <group position={position}>
      <Part center size={[width + 0.2, height + 0.16, 0.14]} color={PALETTE.dark} shadow={false} />
      <mesh geometry={PLANE} position={[0, 0, 0.08]} scale={[width, height, 1]}>
        <meshStandardMaterial map={texture} roughness={0.6} emissive={color} emissiveIntensity={0.25} emissiveMap={texture} />
      </mesh>
    </group>
  );
}

