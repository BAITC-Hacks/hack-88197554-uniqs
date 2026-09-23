// Frontend only. Coordinates follow the supplied three-floor architectural reference.
export type Point2 = [number, number];
export type RoomKind = "meeting" | "work" | "lounge" | "reception" | "kitchen" | "server" | "classroom" | "security" | "director";
export interface FrontendRoom {
  id: string;
  name: string;
  kind: RoomKind;
  polygon: Point2[];
  /** Interior wall edges. Other edges face the continuous glazed facade. */
  walls: number[];
  doors: number[];
  center: Point2;
  label: Point2;
}
export const FRONTEND_ID = "office-frontend";
export const OUTLINE: Point2[] = [[-10, -19], [10, -19], [19, -10], [19, 10], [10, 19], [-10, 19], [-19, 10], [-19, -10]];
const rect = (x1: number, z1: number, x2: number, z2: number): Point2[] => [[x1, z1], [x2, z1], [x2, z2], [x1, z2]];
const northWest: Point2[] = [[-19, -10], [-10, -19], [-9, -19], [-9, -10], [-12, -7], [-19, -7]];
const northEast: Point2[] = [[9, -19], [10, -19], [19, -10], [12, -7], [9, -10]];
const southEast: Point2[] = [[11, 11], [18, 11], [10, 19], [9, 19], [9, 12]];
const southWest: Point2[] = [[-19, 10], [-12, 8], [-9, 11], [-9, 14], [-14, 15]];
const topRoom = (id: string, name: string, left: boolean, kind: RoomKind = "meeting"): FrontendRoom => ({
  id, name, kind, polygon: rect(left ? -9 : 0.2, -19, left ? -0.2 : 9, -10),
  walls: [1, 2, 3], doors: [2], center: [left ? -4.6 : 4.6, -14.6], label: [left ? -4.6 : 4.6, -11.7],
});
const west = (id: string, name: string, kind: RoomKind, z1 = -7, z2 = 8): FrontendRoom => ({
  id, name, kind, polygon: rect(-19, z1, -11, z2), walls: [0, 1, 2], doors: [1], center: [-15, (z1 + z2) / 2], label: [-15, z2 - 1.5],
});
const east = (name: string, kind: RoomKind): FrontendRoom => ({
  id: "east", name, kind, polygon: rect(11, -7, 19, 10), walls: [0, 2, 3], doors: [3], center: [15, 1.5], label: [15, 8.1],
});
const nw = (name: string, kind: RoomKind): FrontendRoom => ({
  id: "nw", name, kind, polygon: northWest, walls: [2, 3, 4], doors: [3], center: [-12.8, -12], label: [-13.5, -8.7],
});
const ne = (name: string, kind: RoomKind): FrontendRoom => ({
  id: "ne", name, kind, polygon: northEast, walls: [3, 4], doors: [3], center: [12.8, -12], label: [13.3, -9.3],
});
const se = (name: string, kind: RoomKind): FrontendRoom => ({
  id: "se", name, kind, polygon: southEast, walls: [0, 4], doors: [4], center: [12.1, 13.3], label: [12, 11.8],
});
export const FRONTEND_FLOORS: { name: string; subtitle: string; rooms: FrontendRoom[] }[] = [
  { name: "Гостевой", subtitle: "Встречи · клиенты · конференции", rooms: [
    topRoom("meeting-a", "Переговорная 01", true), topRoom("meeting-b", "Переговорная 02", false),
    nw("Ожидание", "lounge"), ne("Гостевая зона", "lounge"),
    west("clients", "Клиентский отдел", "work"), east("Конференц-зал", "meeting"),
    { id: "security", name: "Охрана", kind: "security", polygon: southWest, walls: [0, 1, 2], doors: [1], center: [-13.3, 10.6], label: [-13.5, 12.5] },
    { id: "reception", name: "Ресепшен", kind: "reception", polygon: rect(-7.5, 11.5, 8, 19), walls: [0, 1, 3], doors: [0], center: [0, 14], label: [0, 12.2] },
    se("Кофе-зона", "kitchen"),
  ] },
  { name: "Команды", subtitle: "Разработка · маркетинг · продажи", rooms: [
    nw("Маркетинг", "work"),
    { id: "meeting", name: "Переговорная", kind: "meeting", polygon: rect(-9, -19, 9, -10), walls: [1, 2, 3], doors: [2], center: [0, -14.6], label: [0, -11.7] },
    ne("Отдых", "lounge"), west("sales", "Продажи", "work"), east("Разработка", "work"),
    { id: "kitchen", name: "Кухня", kind: "kitchen", polygon: rect(-7.5, 12, 1, 19), walls: [0, 1, 3], doors: [0], center: [-3.2, 15.5], label: [-3.2, 13.2] },
    { id: "server", name: "Серверная", kind: "server", polygon: rect(1.3, 12, 8.5, 19), walls: [0, 1, 3], doors: [0], center: [4.8, 15.7], label: [4.8, 13.2] },
    se("Проектный уголок", "director"),
  ] },
  { name: "Управление", subtitle: "Руководство · проекты · обучение", rooms: [
    nw("Директор", "director"),
    { id: "boardroom", name: "Зал совещаний", kind: "meeting", polygon: rect(-9, -19, 9, -10), walls: [1, 2, 3], doors: [2], center: [0, -14.6], label: [0, -11.7] },
    ne("Финансы", "director"), west("hr", "HR", "work", -7, 2), west("legal", "Юристы", "director", 2.2, 8), east("Проектный отдел", "work"),
    { id: "class", name: "Учебный класс", kind: "classroom", polygon: rect(-7.5, 12, 8, 19), walls: [0, 1, 3], doors: [0], center: [0, 15.6], label: [0, 13.1] },
    se("Кухня", "kitchen"),
  ] },
];

// Existing scene API enters at -1. Here floors are physical storeys, not grades.
export const frontendFloorIndex = (floor: number) => Math.max(0, Math.min(2, floor + 1));
