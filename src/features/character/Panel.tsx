"use client";

// Лист героя: полноэкранный оверлей поверх города (PanelHost рисует его без правой колонки).
// Слева герой в 3D с экипировкой и выбором класса, справа ник, данные и вкладки.

import { Check, ChevronLeft, ChevronRight, Lock, Pencil, RotateCcw, Rotate3d, ScrollText, Swords, Trophy, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GRADE_CHARACTER, setAvatar } from "@/features/city/avatar";
import type { CharacterId } from "@/features/city/models";
import { getScene, sceneActions } from "@/features/city/sceneState";
import { HEROES } from "@/features/hud/CharacterSelect";
import { actions } from "@/lib/client-store";
import { cn } from "@/lib/utils";
import { CLASS_ICON, SLOTS, unlockState, type GearItem, type SlotId } from "./gear";
import { NICK_MAX, setGearPick, setHeroNick } from "./heroStore";
import { HeroStage, type HeroGesture } from "./HeroStage";
import { GearTab, JournalTab, StatsTab, TrophiesTab } from "./SheetTabs";
import { useHero } from "./useHero";

const FORMAT: Record<string, string> = { office: "офис", hybrid: "гибрид", remote: "удалённо" };
type TabId = "stats" | "gear" | "trophies" | "journal";

/** пока лист открыт, герой в городе стоит */
function useLockControls() {
  useEffect(() => {
    const prev = getScene().controlsLocked;
    sceneActions.lockControls(true);
    return () => sceneActions.lockControls(prev);
  }, []);
}

function NickField({ employeeId, nick, fallback }: { employeeId: string; nick: string | null; fallback: string }) {
  const [draft, setDraft] = useState<string | null>(null);

  if (draft !== null) {
    return (
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setHeroNick(employeeId, draft);
          setDraft(null);
        }}
      >
        <label className="flex flex-col gap-0.5">
          <span className="text-[11px] font-medium tracking-wider text-slate-500 uppercase">Имя героя</span>
          <input
            autoFocus
            value={draft}
            maxLength={NICK_MAX}
            placeholder={fallback}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                setDraft(null);
              }
            }}
            className="h-9 w-72 rounded-lg border bg-white px-3 text-lg font-semibold outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </label>
        <Button type="submit" size="icon" className="mt-4" aria-label="Сохранить имя">
          <Check />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="mt-4" aria-label="Отмена" onClick={() => setDraft(null)}>
          <X />
        </Button>
      </form>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <h2 className="truncate text-2xl font-semibold tracking-tight">{nick ?? fallback}</h2>
      <Button size="xs" variant="outline" onClick={() => setDraft(nick ?? "")}>
        <Pencil />
        {nick ? "Изменить" : "Имя героя"}
      </Button>
    </div>
  );
}

function SlotTile({ slot, item, locked, active, onClick }: { slot: SlotId; item: GearItem | null; locked: boolean; active: boolean; onClick: () => void }) {
  const meta = SLOTS.find((s) => s.id === slot)!;
  const Icon = item?.icon ?? meta.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      title={locked ? `${meta.label}: закрыто` : `${meta.label}: ${item?.name ?? "пусто"}`}
      className={cn("flex w-[84px] flex-col items-center gap-1 rounded-xl p-1.5 text-center transition-colors hover:bg-white/10", active && "bg-white/10")}
    >
      <span
        className={cn(
          "flex size-12 items-center justify-center rounded-xl border-2 backdrop-blur-sm",
          item
            ? "border-amber-300/80 bg-amber-300/15 text-amber-200 shadow-[0_0_18px_rgba(251,191,36,.35)]"
            : locked
              ? "border-white/10 bg-white/5 text-slate-500"
              : "border-dashed border-white/25 bg-white/5 text-slate-400",
        )}
      >
        {locked ? <Lock className="size-4" /> : <Icon className="size-5" />}
      </span>
      <span className="text-[10px] tracking-wider text-slate-400 uppercase">{meta.label}</span>
      <span className="line-clamp-1 text-[11px] text-slate-200">{locked ? "закрыто" : (item?.name ?? "пусто")}</span>
    </button>
  );
}

export default function CharacterPanel() {
  const h = useHero();
  const [tab, setTab] = useState<TabId>("stats");
  const [focus, setFocus] = useState<SlotId | null>(null);
  const [gesture, setGesture] = useState<HeroGesture>(null);
  useLockControls();

  const nodes = useMemo(() => Object.values(h.equipped).flatMap((i) => (i?.node ? [i.node] : [])), [h.equipped]);

  function wave(clip: "Cheer" | "Interact") {
    setGesture((g) => ({ clip, seq: (g?.seq ?? 0) + 1 }));
  }

  if (!h.profile) {
    return (
      <section className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-slate-950/45 backdrop-blur-sm">
        <Card className="px-8 py-6 text-muted-foreground">Загрузка профиля…</Card>
      </section>
    );
  }

  const { employee } = h.profile;
  const employeeId = employee.employee_id;
  const gradeHero = GRADE_CHARACTER[employee.grade];
  const idx = Math.max(0, HEROES.findIndex((x) => x.id === h.hero));
  const current = HEROES[idx];
  const ClassIcon = CLASS_ICON[h.hero];

  function pickHero(id: CharacterId | null) {
    setAvatar(id);
    wave("Cheer");
  }

  function toggle(item: GearItem) {
    const worn = h.equipped[item.slot]?.id === item.id;
    setGearPick(employeeId, h.hero, item.slot, worn ? null : item.id);
    if (!worn) wave("Interact");
  }

  function openSlot(slot: SlotId) {
    setTab("gear");
    setFocus(slot);
  }

  const slotState = (slot: SlotId) => {
    const list = h.items.filter((i) => i.slot === slot);
    return { has: list.length > 0, locked: !list.some((i) => unlockState(i.unlock, h.stats).done) };
  };
  const tile = (slot: SlotId) => {
    const s = slotState(slot);
    return s.has ? <SlotTile key={slot} slot={slot} item={h.equipped[slot]} locked={s.locked} active={tab === "gear" && focus === slot} onClick={() => openSlot(slot)} /> : null;
  };

  return (
    <section
      aria-label="Лист героя"
      className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-slate-950/45 backdrop-blur-sm"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) actions.closePanel();
      }}
    >
      <Card className="relative h-[min(720px,calc(100vh-40px))] w-[1200px] gap-0 overflow-hidden bg-white py-0 shadow-2xl">
        <div className="grid h-full grid-cols-[540px_1fr]">
          {/* ── герой ── */}
          <div className="flex min-h-0 flex-col bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 text-white">
            <div className="flex items-start justify-between gap-3 px-7 pt-6">
              <div>
                <div className="flex items-center gap-2 text-xs tracking-wider text-slate-400 uppercase">
                  <ClassIcon className="size-3.5" />
                  Класс героя
                </div>
                <div className="mt-1 text-2xl font-semibold">{current.name}</div>
                <div className="text-xs text-slate-400">
                  {h.manual ? `выбран вручную · по грейду ${employee.grade} — ${HEROES.find((x) => x.id === gradeHero)?.name}` : `по грейду ${employee.grade}`}
                </div>
              </div>
              {h.manual && (
                <Button size="sm" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/15 hover:text-white" onClick={() => pickHero(null)}>
                  <RotateCcw />
                  По грейду
                </Button>
              )}
            </div>

            <div className="relative min-h-0 flex-1">
              <HeroStage hero={h.hero} nodes={nodes} aura={h.equipped.relic?.aura ?? null} gesture={gesture} />
              <div className="absolute top-1/2 left-4 flex -translate-y-1/2 flex-col gap-2">
                {(["head", "back", "relic"] as SlotId[]).map(tile)}
              </div>
              <div className="absolute top-1/2 right-4 flex -translate-y-1/2 flex-col gap-2">
                {(["main", "off"] as SlotId[]).map(tile)}
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <Rotate3d className="size-3.5" />
                Потяни, чтобы повернуть
              </div>
            </div>

            <div className="flex items-center gap-2 px-5 pb-6">
              <Button
                size="icon"
                variant="ghost"
                className="text-slate-300 hover:bg-white/10 hover:text-white"
                aria-label="Предыдущий класс"
                onClick={() => pickHero(HEROES[(idx + HEROES.length - 1) % HEROES.length].id)}
              >
                <ChevronLeft />
              </Button>
              <div className="grid flex-1 grid-cols-4 gap-2">
                {HEROES.map((x) => {
                  const Icon = CLASS_ICON[x.id];
                  const active = x.id === h.hero;
                  return (
                    <button
                      key={x.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => !active && pickHero(x.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors",
                        active ? "border-emerald-400 bg-emerald-400/15" : "border-white/10 bg-white/5 hover:bg-white/10",
                      )}
                    >
                      <Icon className={cn("size-4 shrink-0", active ? "text-emerald-300" : "text-slate-400")} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{x.name}</span>
                        <span className="block text-[11px] text-slate-400">{x.grade === employee.grade ? "ваш грейд" : x.grade}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="text-slate-300 hover:bg-white/10 hover:text-white"
                aria-label="Следующий класс"
                onClick={() => pickHero(HEROES[(idx + 1) % HEROES.length].id)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>

          {/* ── данные ── */}
          <div className="flex min-h-0 flex-col">
            <header className="border-b px-7 pt-6 pr-16 pb-4">
              <div className="flex items-center gap-4">
                <div
                  className="flex size-14 shrink-0 flex-col items-center justify-center rounded-full bg-gradient-to-b from-amber-300 to-orange-500 text-white shadow ring-4 ring-amber-100"
                  title={h.xp ? `Уровень ${h.xp.level} · ${h.xp.title}` : undefined}
                >
                  <span className="text-[9px] leading-none font-semibold uppercase opacity-90">ур.</span>
                  <span className="text-xl leading-none font-bold">{h.xp?.level ?? "—"}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <NickField key={employeeId} employeeId={employeeId} nick={h.nick} fallback={employee.full_name} />
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {h.nick && <span className="font-medium text-foreground">{employee.full_name} · </span>}
                    {employee.role} · {employee.grade} · {employee.department}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                <span className="rounded-full bg-slate-100 px-2.5 py-1">Стаж {employee.tenure_months} мес.</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1">Формат: {FORMAT[employee.work_format]}</span>
                {h.xp && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-900">{h.xp.title}</span>}
                {h.profile.target && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800">
                    Цель: {h.profile.target.role} {h.profile.target.grade}
                  </span>
                )}
              </div>
            </header>

            <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)} className="min-h-0 flex-1 gap-0">
              <div className="px-7 pt-3">
                <TabsList className="w-full">
                  <TabsTrigger value="stats">
                    <UserRound />
                    Характеристики
                  </TabsTrigger>
                  <TabsTrigger value="gear">
                    <Swords />
                    Снаряжение
                  </TabsTrigger>
                  <TabsTrigger value="trophies">
                    <Trophy />
                    Трофеи <span className="text-muted-foreground tabular-nums">{h.trophies.length}</span>
                  </TabsTrigger>
                  <TabsTrigger value="journal">
                    <ScrollText />
                    Журнал <span className="text-muted-foreground tabular-nums">{h.profile.history.length}</span>
                  </TabsTrigger>
                </TabsList>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-7 py-4">
                <TabsContent value="stats">
                  <StatsTab profile={h.profile} />
                </TabsContent>
                <TabsContent value="gear">
                  <GearTab items={h.items} stats={h.stats} equipped={h.equipped} focus={focus} onToggle={toggle} />
                </TabsContent>
                <TabsContent value="trophies">
                  <TrophiesTab trophies={h.trophies} />
                </TabsContent>
                <TabsContent value="journal">
                  <JournalTab history={h.profile.history} byId={h.byId} />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>

        <Button size="icon" variant="ghost" className="absolute top-4 right-4 z-10" aria-label="Закрыть (Esc)" onClick={() => actions.closePanel()}>
          <X />
        </Button>
      </Card>
    </section>
  );
}
