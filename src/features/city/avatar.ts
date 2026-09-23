// Выбор героя в лобби. Ручной выбор привязан к сотруднику: смена сотрудника сбрасывает его,
// и модель снова берётся по грейду. Не React-контекст: читается и внутри <Canvas>.

import { useSyncExternalStore } from "react";
import { getState, useClientStore } from "@/lib/client-store";
import type { Grade } from "@/lib/types";
import type { CharacterId } from "./models";

/** внешность по грейду: класс приключенца растёт вместе с карьерой */
export const GRADE_CHARACTER: Record<Grade, CharacterId> = {
  Junior: "rogue",
  Middle: "knight",
  Senior: "mage",
  Lead: "barbarian",
};

let choice: { employeeId: string; id: CharacterId } | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** ручной выбор героя для текущего сотрудника; null — вернуться к модели по грейду */
export function setAvatar(id: CharacterId | null) {
  choice = id ? { employeeId: getState().employeeId, id } : null;
  listeners.forEach((l) => l());
}

/** ручной выбор для текущего сотрудника или null */
export function useAvatar(): CharacterId | null {
  const employeeId = useClientStore((s) => s.employeeId);
  const c = useSyncExternalStore(subscribe, () => choice, () => null);
  return c && c.employeeId === employeeId ? c.id : null;
}
