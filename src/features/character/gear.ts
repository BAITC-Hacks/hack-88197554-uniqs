// Экипировка и трофеи героя. Чистые функции без React, всё считается из истории профиля и каталога.
// Предметы открываются только за добровольные completed и за уровень опыта:
// обязательные активности ничего не дают (правило датасета), сравнений с коллегами нет.

import {
  Axe,
  BookOpen,
  Clock,
  Coffee,
  Crosshair,
  Crown,
  Gem,
  GraduationCap,
  Hammer,
  Handshake,
  MapPin,
  Medal,
  Shield,
  ShieldCheck,
  Shirt,
  Sparkles,
  Sword,
  Swords,
  VenetianMask,
  Wand,
  WandSparkles,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import type { CharacterId } from "@/features/city/models";
import type { DevEvent, EventType, HistoryRecord } from "@/lib/types";
import { xpForRecord } from "./xp";

export type SlotId = "main" | "off" | "head" | "back" | "relic";
type Format = DevEvent["format"];

export type Unlock =
  | { kind: "start" }
  | { kind: "type"; type: EventType; count: number }
  | { kind: "format"; format: Format; count: number }
  | { kind: "level"; level: number };

export interface GearItem {
  id: string;
  slot: SlotId;
  name: string;
  icon: LucideIcon;
  unlock: Unlock;
  /** имя узла в GLB героя: показываем/прячем на модели */
  node?: string;
  /** цвет искр вокруг героя (реликвии) */
  aura?: string;
}

export const SLOTS: { id: SlotId; label: string; icon: LucideIcon }[] = [
  { id: "main", label: "Оружие", icon: Sword },
  { id: "off", label: "Вторая рука", icon: Shield },
  { id: "head", label: "Голова", icon: Crown },
  { id: "back", label: "Плащ", icon: Shirt },
  { id: "relic", label: "Реликвия", icon: Gem },
];

export const CLASS_ICON: Record<CharacterId, LucideIcon> = {
  rogue: VenetianMask,
  knight: Shield,
  mage: WandSparkles,
  barbarian: Axe,
};

const start: Unlock = { kind: "start" };
const type = (t: EventType, count: number): Unlock => ({ kind: "type", type: t, count });
const format = (f: Format, count: number): Unlock => ({ kind: "format", format: f, count });
const level = (l: number): Unlock => ({ kind: "level", level: l });

function item(hero: CharacterId, slot: SlotId, node: string, name: string, icon: LucideIcon, unlock: Unlock): GearItem {
  return { id: `${hero}:${node}`, slot, node, name, icon, unlock };
}

/** реквизит по реальным именам узлов KayKit Adventurers */
const CLASS_GEAR: Record<CharacterId, GearItem[]> = {
  rogue: [
    item("rogue", "main", "Knife", "Кинжал", Sword, start),
    item("rogue", "main", "1H_Crossbow", "Ручной арбалет", Crosshair, type("course", 1)),
    item("rogue", "main", "2H_Crossbow", "Тяжёлый арбалет", Crosshair, type("course", 3)),
    item("rogue", "off", "Knife_Offhand", "Парный кинжал", Swords, type("workshop", 1)),
    item("rogue", "off", "Throwable", "Метательный снаряд", Sparkles, format("offline", 3)),
    item("rogue", "back", "Rogue_Cape", "Плащ разведчика", Shirt, level(2)),
  ],
  knight: [
    item("knight", "main", "1H_Sword", "Меч", Sword, start),
    item("knight", "main", "2H_Sword", "Двуручный меч", Swords, type("course", 3)),
    item("knight", "off", "Round_Shield", "Круглый щит", Shield, type("workshop", 1)),
    item("knight", "off", "1H_Sword_Offhand", "Второй меч", Swords, type("course", 1)),
    item("knight", "off", "Rectangle_Shield", "Башенный щит", Shield, type("workshop", 3)),
    item("knight", "off", "Badge_Shield", "Щит с гербом", ShieldCheck, type("certification", 1)),
    item("knight", "off", "Spike_Shield", "Шипастый щит", Shield, format("offline", 5)),
    item("knight", "head", "Knight_Helmet", "Шлем рыцаря", Crown, type("mentoring", 1)),
    item("knight", "back", "Knight_Cape", "Плащ рыцаря", Shirt, level(2)),
  ],
  mage: [
    item("mage", "main", "1H_Wand", "Волшебная палочка", Wand, start),
    item("mage", "main", "2H_Staff", "Посох мудреца", WandSparkles, type("course", 3)),
    item("mage", "off", "Spellbook", "Книга заклинаний", BookOpen, type("workshop", 1)),
    item("mage", "off", "Spellbook_open", "Раскрытый гримуар", BookOpen, type("certification", 1)),
    item("mage", "head", "Mage_Hat", "Шляпа мага", Crown, type("mentoring", 1)),
    item("mage", "back", "Mage_Cape", "Мантия мага", Shirt, level(2)),
  ],
  barbarian: [
    item("barbarian", "main", "1H_Axe", "Топор", Axe, start),
    item("barbarian", "main", "2H_Axe", "Секира", Axe, type("course", 3)),
    item("barbarian", "off", "Barbarian_Round_Shield", "Щит варвара", Shield, type("workshop", 1)),
    item("barbarian", "off", "1H_Axe_Offhand", "Второй топор", Axe, type("workshop", 3)),
    item("barbarian", "off", "Mug", "Кружка клуба", Coffee, type("meetup", 1)),
    item("barbarian", "head", "Barbarian_Hat", "Шапка варвара", Crown, type("mentoring", 1)),
    item("barbarian", "back", "Barbarian_Cape", "Плащ варвара", Shirt, level(2)),
  ],
};

const RELICS: GearItem[] = [
  { id: "relic:sparks", slot: "relic", name: "Искры знаний", icon: Sparkles, aura: "#fbbf24", unlock: level(4) },
  { id: "relic:club", slot: "relic", name: "Аура клуба", icon: Gem, aura: "#34d399", unlock: type("meetup", 1) },
];

export function gearFor(hero: CharacterId): GearItem[] {
  return [...CLASS_GEAR[hero], ...RELICS];
}

/** все узлы-реквизит класса: на превью показываем только надетые */
export function gearNodes(hero: CharacterId): string[] {
  return CLASS_GEAR[hero].flatMap((i) => (i.node ? [i.node] : []));
}

// ── Прогресс открытия ────────────────────────────────────────────────────────

export interface GearStats {
  type: Partial<Record<EventType, number>>;
  format: Partial<Record<Format, number>>;
  level: number;
}

/** считаем каждое добровольное completed, повторы регулярного клуба тоже */
export function gearStats(history: HistoryRecord[], byId: Map<string, DevEvent>, lvl: number): GearStats {
  const s: GearStats = { type: {}, format: {}, level: lvl };
  for (const r of history) {
    const e = byId.get(r.event_id);
    if (!e || e.mandatory || r.status !== "completed") continue;
    s.type[e.type] = (s.type[e.type] ?? 0) + 1;
    s.format[e.format] = (s.format[e.format] ?? 0) + 1;
  }
  return s;
}

export function unlockState(u: Unlock, s: GearStats): { have: number; need: number; done: boolean } {
  const [have, need] =
    u.kind === "start" ? [1, 1]
    : u.kind === "level" ? [s.level, u.level]
    : u.kind === "type" ? [s.type[u.type] ?? 0, u.count]
    : [s.format[u.format] ?? 0, u.count];
  return { have: Math.min(have, need), need, done: have >= need };
}

function plural(n: number, [one, few, many]: [string, string, string]): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

const TYPE_WORDS: Record<EventType, [string, string, string]> = {
  course: ["курс", "курса", "курсов"],
  workshop: ["воркшоп", "воркшопа", "воркшопов"],
  mentoring: ["программу менторства", "программы менторства", "программ менторства"],
  certification: ["сертификацию", "сертификации", "сертификаций"],
  meetup: ["встречу клуба", "встречи клуба", "встреч клуба"],
  compliance: ["обязательный курс", "обязательных курса", "обязательных курсов"],
  onboarding: ["онбординг", "онбординга", "онбордингов"],
};

const FORMAT_WORDS: Record<Format, [string, string, string]> = {
  offline: ["офлайн-активность", "офлайн-активности", "офлайн-активностей"],
  online: ["онлайн-активность", "онлайн-активности", "онлайн-активностей"],
  self_paced: ["шаг в своём темпе", "шага в своём темпе", "шагов в своём темпе"],
};

/** «Пройди 1 воркшоп» */
export function unlockHint(u: Unlock): string {
  switch (u.kind) {
    case "start":
      return "Стартовое снаряжение";
    case "level":
      return `Достигни ${u.level} уровня`;
    case "type":
      return `Пройди ${u.count} ${plural(u.count, TYPE_WORDS[u.type])}`;
    case "format":
      return `Пройди ${u.count} ${plural(u.count, FORMAT_WORDS[u.format])}`;
  }
}

export type GearPicks = Partial<Record<SlotId, string | null>>;
export type Equipped = Record<SlotId, GearItem | null>;

/** надетое: ручной выбор, если предмет открыт; null — снято; иначе лучший открытый в слоте */
export function resolveGear(items: GearItem[], stats: GearStats, picks: GearPicks): Equipped {
  const out = {} as Equipped;
  for (const { id: slot } of SLOTS) {
    const open = items.filter((i) => i.slot === slot && unlockState(i.unlock, stats).done);
    const pick = picks[slot];
    out[slot] = pick === null ? null : (open.find((i) => i.id === pick) ?? open.at(-1) ?? null);
  }
  return out;
}

// ── Трофеи ───────────────────────────────────────────────────────────────────

export const TYPE_META: Record<EventType, { label: string; trophy: string; icon: LucideIcon }> = {
  course: { label: "Курс", trophy: "Свиток", icon: BookOpen },
  workshop: { label: "Воркшоп", trophy: "Инструмент мастера", icon: Hammer },
  mentoring: { label: "Менторство", trophy: "Печать наставника", icon: Handshake },
  certification: { label: "Сертификация", trophy: "Медаль", icon: Medal },
  meetup: { label: "Клуб", trophy: "Жетон клуба", icon: Coffee },
  compliance: { label: "Обязательное", trophy: "", icon: ShieldCheck },
  onboarding: { label: "Онбординг", trophy: "", icon: GraduationCap },
};

export const FORMAT_META: Record<Format, { label: string; icon: LucideIcon }> = {
  online: { label: "онлайн", icon: Wifi },
  offline: { label: "офлайн", icon: MapPin },
  self_paced: { label: "в своём темпе", icon: Clock },
};

export type Rarity = "epic" | "rare" | "common";

export const RARITY: Record<Rarity, { label: string; tile: string; text: string }> = {
  epic: { label: "Эпический", tile: "from-violet-500 to-fuchsia-600 ring-violet-300", text: "text-violet-700" },
  rare: { label: "Редкий", tile: "from-sky-500 to-indigo-600 ring-sky-300", text: "text-sky-700" },
  common: { label: "Обычный", tile: "from-slate-500 to-slate-700 ring-slate-300", text: "text-slate-600" },
};

export interface Trophy {
  record: HistoryRecord;
  event: DevEvent;
  xp: number;
  /** по оценке за прохождение: это качество своего шага, не место среди коллег */
  rarity: Rarity;
}

export function trophiesOf(history: HistoryRecord[], byId: Map<string, DevEvent>): Trophy[] {
  const out: Trophy[] = [];
  for (const record of history) {
    const event = byId.get(record.event_id);
    if (!event || event.mandatory || record.status !== "completed") continue;
    const score = record.score ?? 0;
    out.push({ record, event, xp: xpForRecord(event, record).total, rarity: score >= 90 ? "epic" : score >= 75 ? "rare" : "common" });
  }
  return out.sort((a, b) => b.record.date.localeCompare(a.record.date));
}
