"use client";

// Вкладки листа героя: характеристики, снаряжение, трофеи, журнал.

import { Check, Lock, Star } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { skillName } from "@/features/hud/data";
import { ProfileKnowledge } from "@/features/knowledge/ProfileKnowledge";
import type { DevEvent, HistoryRecord, HistoryStatus, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  FORMAT_META,
  RARITY,
  SLOTS,
  TYPE_META,
  unlockHint,
  unlockState,
  type Equipped,
  type GearItem,
  type GearStats,
  type SlotId,
  type Trophy,
} from "./gear";
import { LevelBlock } from "./XpLevel";
import { formatXp, xpForRecord } from "./xp";

export function formatDate(d: string): string {
  const date = new Date(`${d}T00:00:00`);
  return Number.isNaN(date.getTime()) ? d : date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline gap-2">
      <h3 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">{children}</h3>
      {aside && <span className="ml-auto text-xs text-muted-foreground">{aside}</span>}
    </div>
  );
}

// ── Характеристики ───────────────────────────────────────────────────────────

function Pips({ current, required }: { current: number; required: number }) {
  const max = Math.max(5, required, current);
  const met = current >= required;
  return (
    <div className="flex gap-1" aria-hidden>
      {Array.from({ length: max }, (_, i) => {
        const n = i + 1;
        return (
          <span
            key={n}
            className={cn(
              "h-2.5 w-5 rounded-[3px]",
              n <= current ? (met ? "bg-emerald-500" : "bg-amber-400") : n <= required ? "bg-amber-50 ring-1 ring-amber-400 ring-inset" : "bg-slate-200",
            )}
          />
        );
      })}
    </div>
  );
}

export function StatsTab({ profile }: { profile: Profile }) {
  const { target, gradeProgress: gp, gaps, effectiveSkills, reviewBumps } = profile;
  const bumped = new Set(reviewBumps.map((b) => b.skillId));
  const skills = [...gaps].sort(
    (a, b) => Number(b.critical) - Number(a.critical) || b.required - b.current - (a.required - a.current),
  );
  const inGoal = new Set(gaps.map((g) => g.skillId));
  const other = Object.entries(effectiveSkills)
    .filter(([id]) => !inGoal.has(id))
    .sort((a, b) => b[1] - a[1]);
  const otherBumps = reviewBumps.filter((b) => !inGoal.has(b.skillId));

  return (
    <div className="space-y-5">
      <LevelBlock />

      <div className="rounded-xl border bg-slate-50/70 p-4">
        <div className="flex items-baseline gap-2">
          <span className="font-medium">
            Цель: {target ? `${target.role} ${target.grade}` : "вершина лестницы"}
          </span>
          {target?.source === "next_grade" && <span className="text-xs text-muted-foreground">цель не задана — следующий грейд</span>}
        </div>
        {target && (
          <>
            <Progress className="mt-2.5" value={gp.total ? (gp.met / gp.total) * 100 : 100} />
            <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
              Закрыто {gp.met} из {gp.total}, ключевых {gp.criticalMet} из {gp.criticalTotal}
            </p>
          </>
        )}
      </div>

      <ProfileKnowledge profile={profile} />

      {skills.length > 0 && (
        <div>
          <SectionTitle aside="сейчас / нужно для цели">Характеристики цели</SectionTitle>
          <div className="divide-y rounded-xl border">
            {skills.map((g) => {
              const current = effectiveSkills[g.skillId] ?? g.current;
              const met = current >= g.required;
              return (
                <div key={g.skillId} className={cn("flex items-center gap-3 px-3 py-2", g.critical && "bg-amber-50/50")}>
                  <span className="flex min-w-0 flex-1 items-center gap-1.5">
                    {g.critical && <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-500" aria-label="ключевой" />}
                    <span className="truncate font-medium">{skillName(g.skillId)}</span>
                    {g.critical && <Badge variant="destructive" className="shrink-0">ключевой</Badge>}
                    {bumped.has(g.skillId) && <span className="shrink-0 text-xs text-emerald-700">+1 после ревью</span>}
                  </span>
                  <Pips current={current} required={g.required} />
                  <span className={cn("w-10 text-right tabular-nums", met ? "font-semibold text-emerald-700" : "text-slate-700")}>
                    {current} / {g.required}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {other.length > 0 && (
        <div>
          <SectionTitle>Прочие навыки</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {other.map(([id, lvl]) => (
              <span key={id} className="rounded-md border bg-white px-2 py-1 text-xs">
                {skillName(id)} <span className="font-semibold tabular-nums">{lvl}</span>
              </span>
            ))}
          </div>
          {otherBumps.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              После ревью выросли: {otherBumps.map((b) => `${skillName(b.skillId)} ${b.from} → ${b.to}`).join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Снаряжение ───────────────────────────────────────────────────────────────

interface GearTabProps {
  items: GearItem[];
  stats: GearStats;
  equipped: Equipped;
  focus: SlotId | null;
  onToggle: (item: GearItem) => void;
}

export function GearTab({ items, stats, equipped, focus, onToggle }: GearTabProps) {
  const refs = useRef<Partial<Record<SlotId, HTMLElement | null>>>({});
  useEffect(() => {
    if (focus) refs.current[focus]?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [focus]);

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">
        Предметы открываются за добровольные шаги и уровень. Нажми на открытый предмет, чтобы надеть или снять. Обязательные активности предметов не дают.
      </p>
      {SLOTS.map((slot) => {
        const list = items.filter((i) => i.slot === slot.id);
        if (list.length === 0) return null;
        return (
          <section
            key={slot.id}
            ref={(el) => {
              refs.current[slot.id] = el;
            }}
            className={cn("scroll-mt-2 rounded-xl p-2 transition-colors", focus === slot.id && "bg-amber-50 ring-1 ring-amber-300")}
          >
            <SectionTitle aside={equipped[slot.id] ? `надето: ${equipped[slot.id]?.name}` : "пусто"}>
              <span className="inline-flex items-center gap-1.5">
                <slot.icon className="size-3.5" />
                {slot.label}
              </span>
            </SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              {list.map((it) => {
                const u = unlockState(it.unlock, stats);
                const worn = equipped[slot.id]?.id === it.id;
                return (
                  <button
                    key={it.id}
                    type="button"
                    disabled={!u.done}
                    aria-pressed={worn}
                    onClick={() => onToggle(it)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors",
                      worn ? "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-300" : u.done ? "bg-white hover:border-slate-300 hover:bg-slate-50" : "cursor-not-allowed bg-slate-50",
                    )}
                  >
                    <span
                      className={cn(
                        "relative flex size-10 shrink-0 items-center justify-center rounded-lg",
                        worn ? "bg-emerald-500 text-white" : u.done ? "bg-slate-800 text-amber-300" : "bg-slate-200 text-slate-400",
                      )}
                    >
                      {u.done ? <it.icon className="size-5" /> : <Lock className="size-4" />}
                      {worn && <Check className="absolute -right-1 -bottom-1 size-4 rounded-full bg-white p-0.5 text-emerald-600 shadow" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate font-medium", !u.done && "text-slate-500")}>{it.name}</span>
                      {u.done ? (
                        <span className="block text-xs text-muted-foreground">{worn ? "Надето · снять" : it.unlock.kind === "start" ? "Стартовое · надеть" : "Открыто · надеть"}</span>
                      ) : (
                        <>
                          <span className="block text-xs text-slate-500">{unlockHint(it.unlock)}, чтобы открыть</span>
                          <span className="mt-1 flex items-center gap-2">
                            <span className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200">
                              <span className="block h-full rounded-full bg-amber-400" style={{ width: `${(u.have / u.need) * 100}%` }} />
                            </span>
                            <span className="text-[11px] text-slate-500 tabular-nums">
                              {u.have}/{u.need}
                            </span>
                          </span>
                        </>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ── Трофеи ───────────────────────────────────────────────────────────────────

export function TrophiesTab({ trophies }: { trophies: Trophy[] }) {
  const byType = new Map<string, number>();
  for (const t of trophies) byType.set(t.event.type, (byType.get(t.event.type) ?? 0) + 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {[...byType].map(([type, n]) => {
          const m = TYPE_META[type as DevEvent["type"]];
          return (
            <span key={type} className="inline-flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-xs">
              <m.icon className="size-3.5 text-slate-500" />
              {m.label} <span className="font-semibold tabular-nums">{n}</span>
            </span>
          );
        })}
        <span className="ml-auto text-xs text-muted-foreground">Редкость — по вашей оценке за шаг</span>
      </div>

      {trophies.length === 0 && (
        <p className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
          Трофеев пока нет. Пройди добровольный шаг, и он появится здесь.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        {trophies.map(({ record, event, xp, rarity }) => {
          const meta = TYPE_META[event.type];
          const fmt = FORMAT_META[event.format];
          const r = RARITY[rarity];
          return (
            <div key={record.record_id} className="flex gap-3 rounded-xl border bg-white p-3 shadow-xs">
              <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white ring-2", r.tile)}>
                <meta.icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className={cn("text-[10px] font-semibold tracking-wider uppercase", r.text)}>
                  {meta.trophy} · {r.label}
                </div>
                <div className="line-clamp-2 leading-snug font-medium" title={event.title}>
                  {event.title}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  {formatDate(record.date)}
                  <fmt.icon className="ml-1 size-3" />
                  {fmt.label}
                  {xp > 0 && <span className="ml-auto font-semibold text-amber-700 tabular-nums">+{formatXp(xp)} XP</span>}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {event.develops_skills.map((s) => (
                    <span key={s.skill_id} className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-800">
                      {skillName(s.skill_id)} +{s.gain}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">За обязательные активности трофеи и опыт не выдаются. Трофеи видны только вам.</p>
    </div>
  );
}

// ── Журнал ───────────────────────────────────────────────────────────────────

const STATUS: Record<HistoryStatus, { label: string; className: string }> = {
  completed: { label: "пройдено", className: "bg-emerald-100 text-emerald-800" },
  in_progress: { label: "в процессе", className: "bg-sky-100 text-sky-800" },
  overdue: { label: "просрочено", className: "bg-amber-100 text-amber-800" },
  dropped: { label: "брошено", className: "bg-rose-100 text-rose-800" },
  no_show: { label: "не пришёл", className: "bg-rose-100 text-rose-800" },
  declined: { label: "отказ", className: "bg-rose-100 text-rose-800" },
};

export function JournalTab({ history, byId }: { history: HistoryRecord[]; byId: Map<string, DevEvent> }) {
  const rows = [...history].sort((a, b) => b.date.localeCompare(a.date));
  if (rows.length === 0) return <p className="text-muted-foreground">Пока пусто</p>;
  return (
    <div className="divide-y rounded-xl border">
      {rows.map((h) => {
        const e = byId.get(h.event_id);
        const Icon = e ? TYPE_META[e.type].icon : Lock;
        const xp = xpForRecord(e, h).total;
        return (
          <div key={h.record_id} className="flex items-center gap-3 px-3 py-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
              <Icon className="size-3.5" />
            </span>
            <span className="w-24 shrink-0 text-xs text-muted-foreground tabular-nums">{formatDate(h.date)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate" title={h.event_id}>
                {e?.title ?? h.event_id}
              </span>
              {e?.mandatory && <span className="text-[11px] text-muted-foreground">обязательное · без опыта</span>}
            </span>
            {xp > 0 && <span className="text-xs font-semibold text-amber-700 tabular-nums">+{formatXp(xp)} XP</span>}
            <Badge className={STATUS[h.status].className}>{STATUS[h.status].label}</Badge>
          </div>
        );
      })}
    </div>
  );
}
