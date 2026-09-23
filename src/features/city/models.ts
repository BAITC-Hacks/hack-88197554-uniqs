"use client";

// Реестр GLB/GLTF-моделей (public/models/*, все CC0: KayKit City Builder Bits, Furniture Bits,
// Restaurant Bits, Character Pack Adventurers). Загрузка через useGLTF, клоны — SkeletonUtils.

import { useGLTF } from "@react-three/drei";
import { createElement, Suspense, useMemo, type ReactNode } from "react";
import type { Mesh, Object3D } from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { PlaceKind } from "@/lib/types";

/** старый реестр «тип места → модель»; пасхалки могут регистрировать сюда одной строкой */
export const MODELS: Partial<Record<PlaceKind | "player", string>> = {};

export const CHARACTERS = {
  rogue: "/models/adventurers/Rogue.glb",
  knight: "/models/adventurers/Knight.glb",
  mage: "/models/adventurers/Mage.glb",
  barbarian: "/models/adventurers/Barbarian.glb",
} as const;
export type CharacterId = keyof typeof CHARACTERS;

const city = (n: string) => `/models/city/${n}.gltf`;
const furniture = (n: string) => `/models/furniture/${n}.gltf`;
const restaurant = (n: string) => `/models/restaurant/${n}.gltf`;

export const CITY = {
  buildingA: city("building_A"),
  buildingB: city("building_B"),
  buildingC: city("building_C"),
  buildingD: city("building_D"),
  buildingE: city("building_E"),
  buildingF: city("building_F"),
  buildingG: city("building_G"),
  buildingH: city("building_H"),
  bench: city("bench"),
  bush: city("bush"),
  streetlight: city("streetlight"),
  trafficlight: city("trafficlight_B"),
  hydrant: city("firehydrant"),
  dumpster: city("dumpster"),
  trashA: city("trash_A"),
  boxA: city("box_A"),
  watertower: city("watertower"),
  carSedan: city("car_sedan"),
  carHatchback: city("car_hatchback"),
  carWagon: city("car_stationwagon"),
  carTaxi: city("car_taxi"),
  carPolice: city("car_police"),
} as const;

export const FURNITURE = {
  chairA: furniture("chair_A"),
  chairB: furniture("chair_B"),
  chairC: furniture("chair_C"),
  stool: furniture("chair_stool"),
  armchair: furniture("armchair_pillows"),
  couch: furniture("couch_pillows"),
  tableMedium: furniture("table_medium"),
  tableLong: furniture("table_medium_long"),
  tableLow: furniture("table_low"),
  tableSmall: furniture("table_small"),
  lampStanding: furniture("lamp_standing"),
  lampTable: furniture("lamp_table"),
  shelfLarge: furniture("shelf_B_large_decorated"),
  cabinet: furniture("cabinet_medium_decorated"),
  cabinetSmall: furniture("cabinet_small_decorated"),
  cactusA: furniture("cactus_medium_A"),
  cactusB: furniture("cactus_medium_B"),
  cactusSmall: furniture("cactus_small_A"),
  rug: furniture("rug_rectangle_A"),
  rugStripes: furniture("rug_rectangle_stripes_A"),
  rugRound: furniture("rug_oval_A"),
  books: furniture("book_set"),
  book: furniture("book_single"),
  pictureLarge: furniture("pictureframe_large_A"),
  pictureMedium: furniture("pictureframe_medium"),
  pillow: furniture("pillow_A"),
} as const;

export const RESTAURANT = {
  chairA: restaurant("chair_A"),
  chairB: restaurant("chair_B"),
  stool: restaurant("chair_stool"),
  tableRound: restaurant("table_round_A"),
  tableRoundSmall: restaurant("table_round_A_small"),
  tableRoundB: restaurant("table_round_B"),
  counter: restaurant("kitchencounter_straight_A_decorated"),
  counterPlain: restaurant("kitchencounter_straight_A"),
  counterSink: restaurant("kitchencounter_sink"),
  cabinet: restaurant("kitchencabinet"),
  menu: restaurant("menu"),
  pot: restaurant("pot_A"),
  jarA: restaurant("jar_A_large"),
  jarB: restaurant("jar_B_large"),
  jarC: restaurant("jar_C_large"),
  fridge: restaurant("fridge_A"),
  pillar: restaurant("pillar_A"),
  hood: restaurant("extractorhood"),
  shelf: restaurant("shelf_papertowel_decorated"),
  plate: restaurant("plate"),
  bowl: restaurant("bowl"),
  board: restaurant("cuttingboard"),
  stove: restaurant("stove_single_countertop"),
  burger: restaurant("food_burger"),
  dinner: restaurant("food_dinner"),
  stew: restaurant("food_stew"),
  dishrack: restaurant("dishrack_plates"),
  crate: restaurant("crate"),
} as const;

/** подготовить глубокую копию сцены: тени, клон скелета для персонажей */
export function prepareClone(scene: Object3D, shadow = true): Object3D {
  const copy = skeletonClone(scene);
  copy.traverse((o: Object3D) => {
    const m = o as Mesh;
    if (m.isMesh) {
      m.castShadow = shadow;
      m.receiveShadow = shadow;
      m.frustumCulled = true;
    }
  });
  return copy;
}

/** клон модели из кэша useGLTF (внутри Suspense) */
export function useModel(url: string, shadow = true): Object3D {
  const { scene } = useGLTF(url);
  return useMemo(() => prepareClone(scene, shadow), [scene, shadow]);
}

interface ModelProps {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  shadow?: boolean;
}

function ModelInner({ url, position, rotation, scale, shadow = true }: ModelProps) {
  const object = useModel(url, shadow);
  return createElement("primitive", { object, position, rotation, scale });
}

/** статичная модель с ленивой загрузкой; до загрузки — ничего */
export function Model(props: ModelProps) {
  return createElement(Suspense, { fallback: null }, createElement(ModelInner, props));
}

/** GLB из старого реестра, если он зарегистрирован, иначе примитивы из children */
export function ModelOr({ kind, children }: { kind: PlaceKind | "player"; children: ReactNode }) {
  const url = MODELS[kind];
  if (!url) return children;
  return createElement(Suspense, { fallback: children }, createElement(ModelInner, { url }));
}

let preloaded = false;
/** предзагрузка всего, что видно на улице; вызывается один раз из CityCanvas */
export function preloadStreet() {
  if (preloaded) return;
  preloaded = true;
  for (const url of Object.values(CHARACTERS)) useGLTF.preload(url);
  for (const url of Object.values(CITY)) useGLTF.preload(url);
}

export function preloadInteriors() {
  for (const url of Object.values(FURNITURE)) useGLTF.preload(url);
  for (const url of Object.values(RESTAURANT)) useGLTF.preload(url);
}
