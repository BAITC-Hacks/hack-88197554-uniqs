import type { Place } from "@/lib/types";

// Shared by office towers except Frontend. Based on the Backend four-floor plan.
// Coordinates are scene units, not construction dimensions or seating capacity.
export function usesBackendOffice(place: Place): boolean {
  return place.kind === "office" && place.id !== "office-frontend";
}

const OFFICE_NAMES: Record<string, string> = {
  "office-backend": "Backend",
  "office-data": "Data & Analytics",
  "office-qa": "QA",
  "office-product": "Product",
  "office-hr": "HR",
  "office-sales": "Sales",
  "office-support": "Support",
};

export function officeTitle(place: Place): string {
  return OFFICE_NAMES[place.id] ?? place.department ?? place.name.replace(/^Башня /, "");
}

export const WIDTH = 42;
export const DEPTH = 30;
export type Kind = "stairs" | "wc" | "lift" | "kitchen" | "coffee" | "meeting" | "round" | "conference" | "security" | "wardrobe" | "work" | "server" | "lounge" | "director" | "classroom";
export type Door = "north" | "south" | "west" | "east";
export interface BackendRoom {
  id: string;
  name: string;
  kind: Kind;
  /** west, north, east, south */
  rect: [number, number, number, number];
  door: Door;
}
const room = (id: string, name: string, kind: Kind, rect: BackendRoom["rect"], door: Door): BackendRoom => ({ id, name, kind, rect, door });
const core = (guest: boolean): BackendRoom[] => [
  room("stairs-west", "Лестница", "stairs", [-21, -15, -13, -7], "east"),
  room("wc", "Санузлы", "wc", [-10, -15, -4, -7], "south"),
  room("lift", "Лифт", "lift", [-3.7, -13, 0.5, -7], "south"),
  room("kitchen", guest ? "Кофе-зона" : "Кухня", guest ? "coffee" : "kitchen", [1, -15, 12, -7], "south"),
  room("stairs-east", "Лестница", "stairs", [12, -15, 21, -7], "south"),
];
export const BACKEND_FLOORS: { name: string; subtitle: string; rooms: BackendRoom[] }[] = [
  { name: "Гостевой", subtitle: "Ресепшен · встречи · конференции", rooms: [...core(true),
    room("meeting-west", "Переговорная", "meeting", [-21, -4, -9, 5], "east"),
    room("meeting-round", "Переговорная", "round", [-21, 5, -9, 15], "east"),
    room("conference", "Конференц-зал", "conference", [7, -4, 21, 6], "west"),
    room("security", "Охрана", "security", [7, 9, 14, 15], "north"),
    room("wardrobe", "Гардероб", "wardrobe", [14, 9, 21, 15], "north"),
  ] },
  { name: "Рабочие команды", subtitle: "Маркетинг · продажи · рабочая зона", rooms: [...core(false),
    room("marketing", "Маркетинг", "work", [-21, -4, -12, 5], "east"),
    room("sales", "Продажи", "work", [-21, 5, -12, 15], "east"),
    room("meeting-east", "Переговорная", "meeting", [12, -4, 21, 3], "west"),
    room("meeting-round", "Переговорная", "round", [12, 3, 21, 9], "west"),
    room("quiet", "Тихая комната", "lounge", [12, 9, 21, 15], "west"),
  ] },
  { name: "Разработка", subtitle: "Разработка · тестирование · IT-поддержка", rooms: [...core(false),
    room("testing", "Тестирование", "work", [-21, -4, -12, 3], "east"),
    room("server", "Серверная", "server", [-21, 3, -12, 8], "east"),
    room("support", "IT-поддержка", "work", [-21, 8, -12, 15], "east"),
    room("meeting-east", "Переговорная", "meeting", [12, -4, 21, 5], "west"),
    room("lounge", "Комната отдыха", "lounge", [12, 5, 21, 15], "west"),
  ] },
  { name: "Управление", subtitle: "Руководство · финансы · HR · обучение", rooms: [...core(false),
    room("director", "Директор", "director", [-21, -4, -11, 4], "east"),
    room("finance", "Финансы", "work", [-21, 4, -11, 9], "east"),
    room("hr", "HR", "work", [-21, 9, -11, 15], "east"),
    room("boardroom", "Зал совещаний", "meeting", [-8, -3, 9, 6], "west"),
    room("classroom", "Учебный класс", "classroom", [-8, 6, 9, 15], "west"),
    room("legal", "Юристы", "work", [12, -4, 21, 7], "west"),
    room("lounge", "Отдых", "lounge", [12, 7, 21, 15], "west"),
  ] },
];
// Legacy entry uses -1 for lobby; this building has four physical floors, 0–3.
export function backendFloorIndex(floor: number) {
  return Math.max(0, Math.min(3, Math.trunc(floor)));
}
