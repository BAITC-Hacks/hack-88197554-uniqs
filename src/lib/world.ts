// Статичный мир города: места, координаты, правила появления. Без React.
// Координаты в метрах на плоскости земли: [x, z]. Камера смотрит с +z на -z,
// поэтому «вход» зданий — со стороны +z.

import type { Department, DevEvent, Employee, EventType, Grade, PanelId, Place } from "./types";
import { GRADES } from "./types";

export const TOWER_FLOOR_HEIGHT = 3.2;
export const TOWER_FLOORS = 4;
/** подсказка «E — войти» появляется на этом расстоянии от края места */
export const INTERACT_DISTANCE = 2.5;
/** земля: x ∈ [-60, 60], z ∈ [-65, 55] */
export const GROUND = { minX: -60, maxX: 60, minZ: -65, maxZ: 55 };

const DEPARTMENTS: { department: Department; slug: string; color: string }[] = [
  { department: "Backend Development", slug: "backend", color: "#4f7cac" },
  { department: "Frontend Development", slug: "frontend", color: "#5fa8a0" },
  { department: "Data & Analytics", slug: "data", color: "#7a6fb0" },
  { department: "Quality Assurance", slug: "qa", color: "#c9a14a" },
  { department: "Product Management", slug: "product", color: "#c97a4a" },
  { department: "Human Resources", slug: "hr", color: "#b86b8f" },
  { department: "Sales", slug: "sales", color: "#6f9f5a" },
  { department: "Customer Support", slug: "support", color: "#5b8fc9" },
];

export const DEPARTMENT_COLOR: Record<Department, string> = Object.fromEntries(
  DEPARTMENTS.map((d) => [d.department, d.color]),
) as Record<Department, string>;

const VENUES: { eventType: EventType; name: string; position: [number, number]; radius: number }[] = [
  { eventType: "course", name: "Академия", position: [-24, 6], radius: 4.5 },
  { eventType: "workshop", name: "Мастерские", position: [24, 6], radius: 4.5 },
  { eventType: "mentoring", name: "Кофейня наставников", position: [-12, 18], radius: 3.5 },
  { eventType: "certification", name: "Экзаменационный центр", position: [12, 18], radius: 3.5 },
  { eventType: "meetup", name: "Амфитеатр", position: [0, 28], radius: 5 },
  { eventType: "onboarding", name: "Вокзал", position: [-40, 24], radius: 5 },
  { eventType: "compliance", name: "ЦОН", position: [40, 24], radius: 4 },
];

function entranceOf(position: [number, number], radius: number): [number, number] {
  return [position[0], position[1] + radius + 1.2];
}

function buildPlaces(): Place[] {
  const places: Place[] = [];

  // Деловой квартал: 2 ряда по 4 башни.
  const xs = [-27, -9, 9, 27];
  DEPARTMENTS.forEach((d, i) => {
    const position: [number, number] = [xs[i % 4], i < 4 ? -26 : -42];
    const radius = 5.5;
    places.push({
      id: `office-${d.slug}`,
      kind: "office",
      name: `Башня ${d.department}`,
      position,
      radius,
      entrance: entranceOf(position, radius),
      department: d.department,
    });
  });

  // Бизнес-центры «Скоро» — под другие компании.
  [-18, 0, 18].forEach((x, i) => {
    const position: [number, number] = [x, -56];
    places.push({
      id: `soon-${i + 1}`,
      kind: "soon",
      name: "Бизнес-центр «Скоро»",
      position,
      radius: 5,
      entrance: entranceOf(position, 5),
    });
  });

  // Центральная площадь: юрта наставника.
  places.push({
    id: "mentor",
    kind: "mentor",
    name: "Юрта наставника",
    position: [0, 0],
    radius: 3.5,
    entrance: entranceOf([0, 0], 3.5),
  });

  // Площадки обучения.
  for (const v of VENUES) {
    places.push({
      id: `venue-${v.eventType}`,
      kind: "venue",
      name: v.name,
      position: v.position,
      radius: v.radius,
      entrance: entranceOf(v.position, v.radius),
      eventType: v.eventType,
    });
  }

  // Жилой квартал для тех, кто на удалёнке.
  [-30, -18, -6, 6, 18, 30].forEach((x, i) => {
    const position: [number, number] = [x, 44];
    places.push({
      id: `home-${i + 1}`,
      kind: "home",
      name: "Дом",
      position,
      radius: 2.5,
      entrance: entranceOf(position, 2.5),
    });
  });

  return places;
}

export const PLACES: Place[] = buildPlaces();

export function getPlace(id: string): Place | undefined {
  return PLACES.find((p) => p.id === id);
}

export function officeOf(department: Department): Place {
  return PLACES.find((p) => p.kind === "office" && p.department === department)!;
}

export function venueOf(eventType: EventType): Place {
  return PLACES.find((p) => p.kind === "venue" && p.eventType === eventType)!;
}

/** площадка, где проходит активность */
export function venueForEvent(event: Pick<DevEvent, "type">): Place {
  return venueOf(event.type);
}

/** этаж башни для грейда: Junior 0 … Lead 3 */
export function gradeFloor(grade: Grade): number {
  return GRADES.indexOf(grade);
}

/** дом на окраине для remote — стабильно по id сотрудника */
export function homeOf(employeeId: string): Place {
  const homes = PLACES.filter((p) => p.kind === "home");
  let hash = 0;
  for (const ch of employeeId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return homes[hash % homes.length];
}

/** где появляется персонаж: у двери своей башни или у дома (remote) */
export function spawnFor(employee: Pick<Employee, "employee_id" | "department" | "work_format">): [number, number] {
  const place = employee.work_format === "remote" ? homeOf(employee.employee_id) : officeOf(employee.department);
  return place.entrance;
}

/** какая панель открывается у места */
export function panelForPlace(place: Place): PanelId {
  switch (place.kind) {
    case "office":
      return "office";
    case "venue":
      return "venue";
    case "mentor":
      return "mentor";
    case "home":
      return "character";
    case "soon":
      return "soon";
  }
}
