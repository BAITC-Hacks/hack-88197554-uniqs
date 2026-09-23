"use client";

// Состояние сцены города: улица / интерьер / этаж / сидит / подсказка взаимодействия.
// Тот же паттерн, что client-store (useSyncExternalStore), но живёт внутри фичи city.

import { useSyncExternalStore } from "react";
import { actions } from "@/lib/client-store";
import { getPlace } from "@/lib/world";
import type { CharacterAction } from "./Character";

export type SceneMode = "street" | "interior";

export interface Interactable {
  id: string;
  label: string;
  /** мировые координаты объекта [x, y, z]; подсказка рисуется над ним */
  position: [number, number, number];
  radius: number;
  onInteract: () => void;
}

export interface Seat {
  id: string;
  position: [number, number, number];
  /** куда смотрит сидящий */
  yaw: number;
  /** сидит на полу (корпе у дастархана) */
  floor?: boolean;
}

export interface WalkBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** круги, в которые нельзя зайти */
  blockers: { x: number; z: number; r: number }[];
}

export interface SceneState {
  mode: SceneMode;
  /** floor: -1 — лобби, 0…3 — этажи-грейды */
  interior: { placeId: string; floor: number } | null;
  /** id сидения, если персонаж сел */
  seated: Seat | null;
  /** чёрный оверлей: true — закрыт */
  fade: boolean;
  /** объект рядом, с которым можно взаимодействовать */
  hint: Interactable | null;
  /** реплики NPC: id объекта → текст и когда убрать */
  bubbles: Record<string, { text: string; until: number }>;
  /** открыт выбор этажа в лифте */
  elevator: boolean;
  /** разовый жест персонажа (cheer, interact) */
  gesture: { action: CharacterAction; seq: number } | null;
  /** где персонаж появится после смены сцены: [x, z, yaw] */
  spawn: { position: [number, number]; yaw: number; seq: number } | null;
}

let state: SceneState = {
  mode: "street",
  interior: null,
  seated: null,
  fade: false,
  hint: null,
  bubbles: {},
  elevator: false,
  gesture: null,
  spawn: null,
};
const initialState = state;
const listeners = new Set<() => void>();

export function getScene(): SceneState {
  return state;
}

function setScene(patch: Partial<SceneState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useScene<T>(selector: (s: SceneState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(initialState),
  );
}

/** границы ходьбы текущей сцены; на улице — вся земля, круги мест добавляет Player */
export const walkBounds: WalkBounds = { minX: -60, maxX: 60, minZ: -65, maxZ: 55, blockers: [] };

/** объекты для E в текущей сцене: регистрируют компоненты интерьера и улицы */
export const interactables = new Map<string, Interactable>();

let spawnSeq = 0;
let gestureSeq = 0;
let fadeTimer: ReturnType<typeof setTimeout> | null = null;

const FADE_MS = 380;

/** затемнить → выполнить смену сцены → открыть */
function transition(apply: () => void) {
  if (fadeTimer) clearTimeout(fadeTimer);
  setScene({ fade: true, hint: null, elevator: false });
  fadeTimer = setTimeout(() => {
    apply();
    fadeTimer = setTimeout(() => setScene({ fade: false }), 60);
  }, FADE_MS);
}

export const sceneActions = {
  /** войти в здание: лобби (floor -1) либо сразу зал */
  enter(placeId: string, floor = -1) {
    if (!getPlace(placeId) || state.fade) return;
    actions.closePanel();
    actions.clearMoveTarget();
    transition(() => {
      interactables.clear();
      setScene({ mode: "interior", interior: { placeId, floor }, seated: null, bubbles: {} });
    });
  },

  /** лифт: сменить этаж внутри той же башни */
  goFloor(floor: number) {
    const cur = state.interior;
    if (!cur) return;
    transition(() => {
      interactables.clear();
      setScene({ interior: { placeId: cur.placeId, floor }, seated: null });
    });
  },

  /** Выход к двери либо к месту быстрого перемещения. true сохраняет прежний контракт keepPosition. */
  exit(destination?: [number, number] | boolean) {
    const cur = state.interior;
    if (!cur) return;
    const entrance = Array.isArray(destination) ? destination : destination === true ? null : getPlace(cur.placeId)?.entrance;
    actions.closePanel();
    actions.clearMoveTarget();
    transition(() => {
      interactables.clear();
      setScene({ mode: "street", interior: null, seated: null, bubbles: {}, spawn: entrance ? { position: entrance, yaw: 0, seq: ++spawnSeq } : state.spawn });
    });
  },

  setSpawn(position: [number, number], yaw: number) {
    setScene({ spawn: { position, yaw, seq: ++spawnSeq } });
  },

  setHint(hint: Interactable | null) {
    if (state.hint?.id !== hint?.id) setScene({ hint });
  },

  sit(seat: Seat) {
    setScene({ seated: seat, hint: null });
  },

  stand() {
    if (state.seated) setScene({ seated: null });
  },

  say(id: string, text: string, ms = 3200) {
    setScene({ bubbles: { ...state.bubbles, [id]: { text, until: Date.now() + ms } } });
    setTimeout(() => {
      const b = state.bubbles[id];
      if (b && b.until <= Date.now()) {
        const next = { ...state.bubbles };
        delete next[id];
        setScene({ bubbles: next });
      }
    }, ms + 20);
  },

  openElevator(open: boolean) {
    setScene({ elevator: open });
  },

  gesture(action: CharacterAction) {
    setScene({ gesture: { action, seq: ++gestureSeq } });
  },
};

export function setWalkBounds(b: Partial<WalkBounds>) {
  Object.assign(walkBounds, b);
}
