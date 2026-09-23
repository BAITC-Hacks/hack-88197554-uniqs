// Тур наставника по городу после лобби: активен ли, какой шаг, уходит ли наставник в юрту.
// useSyncExternalStore, чтобы читать и в HUD, и внутри <Canvas>.

import { useSyncExternalStore } from "react";

export interface TourState {
  active: boolean;
  index: number;
  /** тур закрыт, наставник идёт к юрте и исчезает */
  leaving: boolean;
  /** растёт на каждый старт: наставник заново появляется рядом с игроком */
  seq: number;
}

let state: TourState = { active: false, index: 0, leaving: false, seq: 0 };
const initialState = state;
const listeners = new Set<() => void>();

function set(patch: Partial<TourState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getTour(): TourState {
  return state;
}

export function useTour<T>(selector: (s: TourState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(initialState));
}

export const tourActions = {
  start() {
    set({ active: true, index: 0, leaving: false, seq: state.seq + 1 });
  },
  go(index: number) {
    if (state.active) set({ index: Math.max(0, index) });
  },
  /** закрыть тур; наставник уходит в юрту */
  finish() {
    if (state.active) set({ active: false, leaving: true });
  },
  /** наставник дошёл до юрты */
  gone() {
    if (state.leaving) set({ leaving: false });
  },
  /** сразу убрать без ухода (смена сотрудника) */
  reset() {
    set({ active: false, leaving: false, index: 0 });
  },
};
