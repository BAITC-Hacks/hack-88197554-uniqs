"use client";

// Клиентское состояние на useSyncExternalStore, без библиотек.
// Не React-контекст: контекст не всегда доходит внутрь <Canvas> (другой reconciler).
// В компонентах: useClientStore((s) => s.profile). Селектор возвращает поле состояния,
// а не новый объект, иначе бесконечный ререндер. В useFrame: getState() без подписки.

import { useSyncExternalStore } from "react";
import type { Employee, PanelId, ProgressDelta, Profile, Recommendation } from "./types";
import { getPlace, panelForPlace, spawnFor } from "./world";

export interface ClientState {
  employees: Employee[];
  employeeId: string;
  profile: Profile | null;
  recommendations: Recommendation[];
  /** eventId взятых квестов */
  acceptedQuests: string[];
  openPanel: { panel: PanelId; placeId?: string } | null;
  /** ближайшее место, у которого можно нажать E */
  nearPlaceId: string | null;
  /** куда идёт персонаж по клику; openPlaceId — открыть панель по приходу */
  moveTarget: { position: [number, number]; openPlaceId?: string } | null;
  /** разовый телепорт: Player применяет, когда seq меняется */
  teleport: { position: [number, number]; seq: number } | null;
  /** последнее «Выполнено» — для анимаций «+1» и лифта */
  lastDelta: ProgressDelta | null;
}

export const DEFAULT_EMPLOYEE_ID = "E0028";

let state: ClientState = {
  employees: [],
  employeeId: DEFAULT_EMPLOYEE_ID,
  profile: null,
  recommendations: [],
  acceptedQuests: [],
  openPanel: null,
  nearPlaceId: null,
  moveTarget: null,
  teleport: null,
  lastDelta: null,
};
const initialState = state;
const listeners = new Set<() => void>();

export function getState(): ClientState {
  return state;
}

function setState(patch: Partial<ClientState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useClientStore<T>(selector: (s: ClientState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(initialState),
  );
}

let teleportSeq = 0;

export const actions = {
  async loadEmployees() {
    const res = await fetch("/api/employees");
    if (!res.ok) return;
    const employees = (await res.json()) as Employee[];
    setState({ employees });
    const current = employees.find((e) => e.employee_id === state.employeeId);
    if (current && !state.teleport) {
      setState({ teleport: { position: spawnFor(current), seq: ++teleportSeq } });
    }
  },

  async refreshProfile() {
    const id = state.employeeId;
    const res = await fetch(`/api/profile/${encodeURIComponent(id)}`);
    if (!res.ok || state.employeeId !== id) return;
    setState({ profile: (await res.json()) as Profile });
  },

  selectEmployee(employeeId: string) {
    const employee = state.employees.find((e) => e.employee_id === employeeId);
    setState({
      employeeId,
      profile: null,
      recommendations: [],
      acceptedQuests: [],
      openPanel: null,
      moveTarget: null,
      lastDelta: null,
      teleport: employee ? { position: spawnFor(employee), seq: ++teleportSeq } : state.teleport,
    });
    void actions.refreshProfile();
  },

  openPanel(panel: PanelId, placeId?: string) {
    setState({ openPanel: { panel, placeId } });
  },

  closePanel() {
    setState({ openPanel: null });
  },

  /** открыть панель места, у которого стоит персонаж или по которому кликнули */
  openPlace(placeId: string) {
    const place = getPlace(placeId);
    if (place) setState({ openPanel: { panel: panelForPlace(place), placeId } });
  },

  setNearPlace(nearPlaceId: string | null) {
    if (state.nearPlaceId !== nearPlaceId) setState({ nearPlaceId });
  },

  walkTo(position: [number, number], openPlaceId?: string) {
    setState({ moveTarget: { position, openPlaceId } });
  },

  clearMoveTarget() {
    if (state.moveTarget) setState({ moveTarget: null });
  },

  /** быстрое перемещение из HUD: телепорт к входу и открыть панель */
  travelTo(placeId: string) {
    const place = getPlace(placeId);
    if (!place) return;
    setState({
      moveTarget: null,
      teleport: { position: place.entrance, seq: ++teleportSeq },
      openPanel: { panel: panelForPlace(place), placeId },
    });
  },

  setRecommendations(recommendations: Recommendation[]) {
    setState({ recommendations });
  },

  acceptQuest(eventId: string) {
    if (!state.acceptedQuests.includes(eventId)) {
      setState({ acceptedQuests: [...state.acceptedQuests, eventId] });
    }
  },

  dropQuest(eventId: string) {
    setState({
      acceptedQuests: state.acceptedQuests.filter((id) => id !== eventId),
      recommendations: state.recommendations.filter((r) => r.eventId !== eventId),
    });
  },

  applyDelta(delta: ProgressDelta) {
    setState({
      lastDelta: delta,
      acceptedQuests: state.acceptedQuests.filter((id) => id !== delta.eventId),
      recommendations: state.recommendations.filter((r) => r.eventId !== delta.eventId),
    });
    void actions.refreshProfile();
  },
};
