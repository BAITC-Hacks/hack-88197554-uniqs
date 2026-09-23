"use client";

// Общие геометрии и материалы сцены: создаются один раз на модуль,
// меши масштабируются через scale. Файл грузится только на клиенте (ssr: false).

import {
  BoxGeometry,
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  FrontSide,
  IcosahedronGeometry,
  MeshStandardMaterial,
  RingGeometry,
  SphereGeometry,
} from "three";

type Vec3 = [number, number, number];

export const GEO = {
  box: new BoxGeometry(1, 1, 1),
  /** цилиндр радиуса 1 и высоты 1, центр посередине */
  cyl: new CylinderGeometry(1, 1, 1, 16),
  cyl8: new CylinderGeometry(1, 1, 1, 8),
  cone: new ConeGeometry(1, 1, 12),
  cone6: new ConeGeometry(1, 1, 6),
  sphere: new SphereGeometry(1, 12, 8),
  ico: new IcosahedronGeometry(1, 0),
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

/** общий материал по цвету; emissive — для подсветки */
export function mat(color: string, opts: { emissive?: string; intensity?: number; double?: boolean } = {}) {
  const key = `${color}|${opts.emissive ?? ""}|${opts.intensity ?? ""}|${opts.double ? 1 : 0}`;
  let m = cache.get(key);
  if (!m) {
    m = new MeshStandardMaterial({
      color,
      flatShading: true,
      roughness: 0.85,
      metalness: 0,
      emissive: opts.emissive ?? "#000000",
      emissiveIntensity: opts.intensity ?? 1,
      side: opts.double ? DoubleSide : FrontSide,
    });
    cache.set(key, m);
  }
  return m;
}

export const PALETTE = {
  grass: "#9cc27a",
  grassFar: "#8db86c",
  road: "#ece3cf",
  roadEdge: "#dcd0b4",
  plaza: "#f3ead6",
  plazaInner: "#e6d7b8",
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
};

interface PartProps {
  /** низ детали по центру; с center — центр детали */
  position?: Vec3;
  rotation?: Vec3;
  /** масштаб единичной геометрии: box — размеры, cyl/cone — [радиус, высота, радиус], sphere/ico — радиусы */
  size: Vec3;
  color: string;
  geo?: keyof typeof GEO;
  emissive?: string;
  intensity?: number;
  shadow?: boolean;
  center?: boolean;
}

/** примитив с общей геометрией и общим материалом */
export function Part({ position = [0, 0, 0], rotation, size, color, geo = "box", emissive, intensity, shadow = true, center }: PartProps) {
  const lift = center || geo === "prism" ? 0 : geo === "sphere" || geo === "ico" ? size[1] : size[1] / 2;
  return (
    <mesh
      geometry={GEO[geo]}
      material={mat(color, { emissive, intensity })}
      position={[position[0], position[1] + lift, position[2]]}
      rotation={rotation}
      scale={size}
      castShadow={shadow}
      receiveShadow
    />
  );
}
