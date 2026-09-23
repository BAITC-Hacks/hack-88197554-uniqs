import type { Place } from "@/lib/types";

// Планировки развивают офис Елнура: codex/office, a3bab6e,
// prototypes/office/shared/world.mjs. Комнаты соединены проходами, улицы внутри нет.
export type ZoneKind = "work" | "meeting" | "lounge" | "academy";
export interface OfficeZone {
  kind: ZoneKind;
  title: string;
  x: number;
  z: number;
  w: number;
  d: number;
  door: "south" | "east" | "west";
}
export interface OfficePlan {
  title: string;
  w: number;
  d: number;
  accent: string;
  reception: [number, number];
  zones: OfficeZone[];
}

const zone = (kind: ZoneKind, title: string, x: number, z: number, w: number, d: number, door: OfficeZone["door"] = "south"): OfficeZone =>
  ({ kind, title, x, z, w, d, door });

export const OFFICE_PLANS: OfficePlan[] = [
  {
    title: "Два рабочих крыла", w: 36, d: 30, accent: "#658b9f", reception: [0, -11.8],
    zones: [zone("work", "Разработка", -10, -6, 13, 13, "east"), zone("work", "Проектная команда", 10, -6, 13, 13, "west"), zone("meeting", "Переговорная", -10, 7.6, 13, 10, "east"), zone("lounge", "Кофе-поинт", 10, 7.6, 13, 10, "west")],
  },
  {
    title: "Открытая студия", w: 36, d: 28, accent: "#5f9b8b", reception: [-14, 10.5],
    zones: [zone("work", "Командная студия", -7, -6, 19, 12), zone("meeting", "Обсуждения", 11, -6, 10, 12, "west"), zone("lounge", "Гостиная", 10, 7.8, 12, 8), zone("academy", "Дизайн-ревью", -8, 6, 12, 7)],
  },
  {
    title: "Центральная лаборатория", w: 36, d: 30, accent: "#8f82aa", reception: [-13.8, 11.5],
    zones: [zone("work", "Лаборатория данных", 0, -5, 16, 16), zone("meeting", "Тихая комната", -12.5, -7, 7, 11, "east"), zone("lounge", "Перерыв", 12.5, -6, 7, 12, "west"), zone("academy", "Разбор исследований", 7.5, 8.3, 16, 8)],
  },
  {
    title: "Камерные кабинеты", w: 36, d: 28, accent: "#b49964", reception: [0, -10.8],
    zones: [zone("work", "Кабинет 01", -10, -7.5, 13, 8, "east"), zone("work", "Кабинет 02", -10, 3, 13, 9, "east"), zone("work", "Кабинет 03", 10, -7.5, 13, 8, "west"), zone("meeting", "Разбор качества", 10, 3, 13, 9, "west")],
  },
  {
    title: "Проектный штаб", w: 38, d: 30, accent: "#b58a70", reception: [14.5, 11.4],
    zones: [zone("meeting", "Большая переговорная", 0, -8.5, 22, 10), zone("work", "Продуктовая команда", -11, 4.5, 13, 12, "east"), zone("work", "Проектная группа", 11, 3, 13, 9, "west"), zone("lounge", "Кофе и идеи", 0, 8.5, 7, 9)],
  },
  {
    title: "Офис встреч", w: 36, d: 30, accent: "#a78092", reception: [0, 7.5],
    zones: [zone("meeting", "Встречи один на один", -10, -7.5, 13, 9, "east"), zone("meeting", "Развитие команды", 10, -7.5, 13, 9, "west"), zone("work", "People team", -10, 5, 13, 12, "east"), zone("lounge", "Гостевая зона", 10, 5, 13, 12, "west")],
  },
  {
    title: "Клиентский офис", w: 38, d: 28, accent: "#819d64", reception: [0, 9.5],
    zones: [zone("work", "Команда продаж", -9, -6.5, 16, 11), zone("meeting", "Клиентские встречи", 10, -6.5, 14, 11), zone("lounge", "Ожидание", -11, 7, 12, 8, "east"), zone("meeting", "Переговоры", 11, 7, 12, 8, "west")],
  },
  {
    title: "Командные острова", w: 38, d: 30, accent: "#739aaf", reception: [0, -11.8],
    zones: [zone("work", "Поддержка A", -11, -7, 12, 10, "east"), zone("work", "Поддержка B", 11, -7, 12, 10, "west"), zone("academy", "Обучение команды", -11, 6, 12, 11, "east"), zone("lounge", "Комната отдыха", 11, 6, 12, 11, "west")],
  },
];

const OFFICE_IDS = ["office-backend", "office-frontend", "office-data", "office-qa", "office-product", "office-hr", "office-sales", "office-support"];

export function officePlanFor(place: Place): OfficePlan {
  const index = OFFICE_IDS.indexOf(place.id);
  if (index >= 0) return OFFICE_PLANS[index];
  // Стабильная планировка остальных существующих зданий, без случайности при входе.
  const seed = Array.from(place.id).reduce((n, ch) => n * 31 + ch.charCodeAt(0) >>> 0, 0);
  return OFFICE_PLANS[seed % OFFICE_PLANS.length];
}
