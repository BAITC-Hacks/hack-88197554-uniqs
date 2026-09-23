// Тур наставника в окне HUD после лобби: активен ли и какой шаг открыт.

import { useSyncExternalStore } from "react";

export interface TourState {
  active: boolean;
  index: number;
}

let state: TourState = { active: false, index: 0 };
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

export function useTour<T>(selector: (s: TourState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(initialState));
}

export const tourActions = {
  start() {
    set({ active: true, index: 0 });
  },
  go(index: number) {
    if (state.active) set({ index: Math.max(0, index) });
  },
  /** закрыть окно тура */
  finish() {
    if (state.active) set({ active: false });
  },
  /** сбросить тур при смене сотрудника */
  reset() {
    set({ active: false, index: 0 });
  },
};
