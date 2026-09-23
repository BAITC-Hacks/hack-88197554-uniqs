// Раскладка дорог и площади. Общая для Ground (рисует) и Decor (не сажает деревья на дорогу).

import { GROUND, PLACES } from "@/lib/world";

/** прямоугольная полоса дороги: центр [x, z], размеры [ширина по x, длина по z] */
export interface Road {
  x: number;
  z: number;
  w: number;
  d: number;
}

function hRoad(z: number, x0: number, x1: number, width: number): Road {
  return { x: (x0 + x1) / 2, z, w: x1 - x0, d: width };
}
function vRoad(x: number, z0: number, z1: number, width: number): Road {
  return { x, z: (z0 + z1) / 2, w: width, d: z1 - z0 };
}

export const PLAZA = { x: 0, z: 0, radius: 9 };

export const ROADS: Road[] = [
  // главный проспект север — юг (разрыв под амфитеатр)
  vRoad(0, -50, 22, 5),
  vRoad(0, 33, 49, 5),
  // деловой квартал
  hRoad(-18, -42, 42, 4),
  hRoad(-34, -42, 42, 4),
  hRoad(-49.5, -28, 28, 3),
  vRoad(-18, -49.5, -18, 3),
  vRoad(18, -49.5, -18, 3),
  vRoad(-40, -34, 12, 3),
  vRoad(40, -34, 12, 3),
  // кольцо площадок
  hRoad(12, -48, 48, 4),
  hRoad(36, -48, 48, 3),
  vRoad(-48, 12, 49, 3),
  vRoad(48, 12, 49, 3),
  // жилая улица
  hRoad(49.5, -48, 48, 3),
];

export function onRoad(x: number, z: number, margin = 0): boolean {
  if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA.radius + margin) return true;
  return ROADS.some((r) => Math.abs(x - r.x) < r.w / 2 + margin && Math.abs(z - r.z) < r.d / 2 + margin);
}

export function nearPlace(x: number, z: number, margin: number): boolean {
  return PLACES.some((p) => Math.hypot(x - p.position[0], z - p.position[1]) < p.radius + margin);
}

export const GROUND_CENTER: [number, number] = [(GROUND.minX + GROUND.maxX) / 2, (GROUND.minZ + GROUND.maxZ) / 2];
export const GROUND_SIZE: [number, number] = [GROUND.maxX - GROUND.minX, GROUND.maxZ - GROUND.minZ];
