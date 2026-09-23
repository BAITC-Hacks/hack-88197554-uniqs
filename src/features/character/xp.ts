// Опыт и уровень персонажа. Чистые функции без React.
// XP только за добровольные completed: очки за обязательные активности запрещены правилами.
// Видно только самому сотруднику в его карточке, в HR и рейтинги не уходит.

import type { DevEvent, HistoryRecord, Profile } from "@/lib/types";

/** XP за час активности */
export const XP_PER_HOUR = 5;
/** XP за каждый уровень прироста навыка (сумма gain) */
export const XP_PER_GAIN = 25;
/** бонус за качество: (score − 50)% от базы, максимум +50% при score 100; score null считаем как 100 */
export const QUALITY_FLOOR = 50;

/** длина уровня L: 200, 250, 300, … XP */
export const LEVEL_BASE = 200;
export const LEVEL_STEP = 50;

export const LEVEL_TITLES = ["Новичок", "Стажёр", "Практик", "Специалист", "Мастер", "Эксперт", "Виртуоз", "Магистр", "Легенда"];

export const XP_RULE =
  `${XP_PER_HOUR} XP за час активности + ${XP_PER_GAIN} XP за каждый уровень навыка, ` +
  `и до +50% за качество (оценка выше ${QUALITY_FLOOR}). Только добровольные шаги, за обязательные опыт не начисляется.`;

export interface XpBreakdown {
  base: number;
  qualityBonus: number;
  total: number;
}

export interface XpInfo {
  /** всего опыта */
  xp: number;
  level: number;
  /** опыт внутри текущего уровня */
  levelXp: number;
  /** длина текущего уровня: сколько нужно от его начала до следующего */
  nextLevelXp: number;
  title: string;
}

const ZERO: XpBreakdown = { base: 0, qualityBonus: 0, total: 0 };

export function xpForRecord(event: DevEvent | undefined, record: HistoryRecord): XpBreakdown {
  if (!event || record.status !== "completed" || event.mandatory) return ZERO;
  const gain = event.develops_skills.reduce((sum, s) => sum + s.gain, 0);
  const base = XP_PER_HOUR * event.duration_hours + XP_PER_GAIN * gain;
  const score = Math.min(100, record.score ?? 100);
  const qualityBonus = Math.round((base * Math.max(0, score - QUALITY_FLOOR)) / 100);
  return { base, qualityBonus, total: base + qualityBonus };
}

export function levelSpan(level: number): number {
  return LEVEL_BASE + LEVEL_STEP * (level - 1);
}

export function levelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length) - 1];
}

export function levelOf(xp: number): XpInfo {
  let level = 1;
  let floor = 0;
  while (xp >= floor + levelSpan(level)) {
    floor += levelSpan(level);
    level += 1;
  }
  return { xp, level, levelXp: xp - floor, nextLevelXp: levelSpan(level), title: levelTitle(level) };
}

export function eventIndex(events: DevEvent[]): Map<string, DevEvent> {
  return new Map(events.map((e) => [e.event_id, e]));
}

/** каждый completed засчитывается, в том числе повторы регулярного клуба EV_036 */
export function xpOf(profile: Profile, events: DevEvent[]): XpInfo {
  const byId = eventIndex(events);
  const xp = profile.history.reduce((sum, r) => sum + xpForRecord(byId.get(r.event_id), r).total, 0);
  return levelOf(xp);
}

/** «1 240» */
export function formatXp(n: number): string {
  return n.toLocaleString("ru-RU");
}
