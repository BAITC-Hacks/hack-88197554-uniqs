"use client";

// Реестр GLB-моделей: тип места (или "player") → путь в public/models/.
// Пока пусто — всё рисуется примитивами. Фича city-assets регистрирует GLB одной строкой:
//   office: "/models/office.glb",

import { useGLTF } from "@react-three/drei";
import { createElement, Suspense, useMemo, type ReactNode } from "react";
import type { Mesh, Object3D } from "three";
import type { PlaceKind } from "@/lib/types";

export const MODELS: Partial<Record<PlaceKind | "player", string>> = {};

function Gltf({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const object = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((o: Object3D) => {
      if ((o as Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return copy;
  }, [scene]);
  return createElement("primitive", { object });
}

/** GLB из реестра, если он зарегистрирован, иначе примитивы из children */
export function ModelOr({ kind, children }: { kind: PlaceKind | "player"; children: ReactNode }) {
  const url = MODELS[kind];
  if (!url) return children;
  return createElement(Suspense, { fallback: children }, createElement(Gltf, { url }));
}
