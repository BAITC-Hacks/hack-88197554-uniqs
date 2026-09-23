"use client";

// Награда за выполненный шаг: «+85 XP», разбивка и полоска, при повышении — «Новый уровень».
// Срабатывает, когда после нового lastDelta приходит обновлённый профиль того же сотрудника.
// Рисуется порталом в body поверх модалки практики.

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useEvents } from "@/features/hud/data";
import { useClientStore } from "@/lib/client-store";
import type { ProgressDelta, Profile } from "@/lib/types";
import { eventIndex, formatXp, xpForRecord, xpOf } from "./xp";

const SHOW_MS = 4000;
const GUARDED = ["pointerdown", "pointerup", "mousedown", "mouseup", "touchstart", "touchend", "click"];

const KEYFRAMES = `
@keyframes xp-card { 0% { opacity: 0; transform: translateY(-16px) scale(.9) } 60% { opacity: 1; transform: translateY(2px) scale(1.03) } 100% { opacity: 1; transform: none } }
@keyframes xp-pop { 0% { opacity: 0; transform: scale(.4) } 70% { opacity: 1; transform: scale(1.15) } 100% { opacity: 1; transform: scale(1) } }
@keyframes xp-fill { from { width: var(--xp-from) } to { width: var(--xp-to) } }
@keyframes xp-levelup-fill { 0% { width: var(--xp-from) } 45% { width: 100% } 50% { width: 0% } 100% { width: var(--xp-to) } }
@keyframes xp-fade-out { to { opacity: 0 } }
@keyframes xp-fade-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes xp-shine { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
@keyframes xp-life { 0%, 90% { opacity: 1 } 100% { opacity: 0 } }
`;

interface Before {
  delta: ProgressDelta;
  profile: Profile;
}

export function XpReward() {
  const lastDelta = useClientStore((s) => s.lastDelta);
  const profile = useClientStore((s) => s.profile);
  const events = useEvents();
  const cardRef = useRef<HTMLDivElement>(null);

  // снимок профиля в момент нового lastDelta: профиль ещё старый, обновлённый придёт после refreshProfile
  const [trackedDelta, setTrackedDelta] = useState(lastDelta);
  const [before, setBefore] = useState<Before | null>(null);
  const [dismissed, setDismissed] = useState<ProgressDelta | null>(null);
  if (lastDelta !== trackedDelta) {
    setTrackedDelta(lastDelta);
    setBefore(lastDelta && profile && profile.employee.employee_id === lastDelta.employeeId ? { delta: lastDelta, profile } : null);
  }

  const reward = useMemo(() => {
    if (!before || !profile || profile === before.profile || events.length === 0) return null;
    // XP сравниваем только в рамках одного сотрудника
    if (profile.employee.employee_id !== before.delta.employeeId) return null;
    const byId = eventIndex(events);
    const oldIds = new Set(before.profile.history.map((r) => r.record_id));
    const fresh = profile.history.filter((r) => !oldIds.has(r.record_id));
    const parts = fresh.map((r) => xpForRecord(byId.get(r.event_id), r));
    const total = parts.reduce((s, p) => s + p.total, 0);
    if (total <= 0) return null;
    const scored = fresh.find((r) => r.event_id === before.delta.eventId) ?? fresh[0];
    return {
      delta: before.delta,
      title: byId.get(before.delta.eventId)?.title ?? before.delta.eventId,
      score: scored?.score ?? null,
      base: parts.reduce((s, p) => s + p.base, 0),
      qualityBonus: parts.reduce((s, p) => s + p.qualityBonus, 0),
      total,
      from: xpOf(before.profile, events),
      to: xpOf(profile, events),
    };
  }, [before, profile, events]);

  const visible = reward !== null && dismissed !== reward.delta;
  const key = reward?.delta ?? null;

  useEffect(() => {
    if (!visible || !key) return;
    const timer = setTimeout(() => setDismissed(key), SHOW_MS);
    // клики по карточке не должны доходить до модалки (закроется как «клик снаружи») и до сцены
    const guard = (e: Event) => {
      if (!(e.target instanceof Node) || !cardRef.current?.contains(e.target)) return;
      e.stopPropagation();
      if (e.type === "click") setDismissed(key);
    };
    GUARDED.forEach((t) => window.addEventListener(t, guard, true));
    return () => {
      clearTimeout(timer);
      GUARDED.forEach((t) => window.removeEventListener(t, guard, true));
    };
  }, [visible, key]);

  if (!visible || !reward || typeof document === "undefined") return null;

  const { from, to } = reward;
  const leveledUp = to.level > from.level;
  const fromPct = Math.min(100, (from.levelXp / from.nextLevelXp) * 100);
  const toPct = Math.min(100, (to.levelXp / to.nextLevelXp) * 100);
  const barStyle = {
    "--xp-from": `${fromPct}%`,
    "--xp-to": `${toPct}%`,
    animation: leveledUp ? "xp-levelup-fill 1.8s ease-in-out 350ms both" : "xp-fill 1.1s ease-out 350ms both",
  } as CSSProperties;
  const swap = leveledUp ? "1.15s" : "0s";

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-24 z-[1000] flex justify-center" style={{ animation: `xp-life ${SHOW_MS}ms linear both` }}>
      <style>{KEYFRAMES}</style>
      <div
        ref={cardRef}
        role="status"
        title="Нажмите, чтобы закрыть"
        className="pointer-events-auto w-[380px] cursor-pointer rounded-2xl bg-white/95 p-5 text-sm shadow-2xl ring-2 ring-amber-300 backdrop-blur"
        style={{ animation: "xp-card 450ms ease-out both" }}
      >
        <div className="flex items-baseline justify-between gap-3">
          <div
            className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-4xl font-black tracking-tight text-transparent"
            style={{ animation: "xp-pop 600ms ease-out 150ms both" }}
          >
            +{formatXp(reward.total)} XP
          </div>
          <div className="truncate text-right text-xs text-muted-foreground">{reward.title}</div>
        </div>

        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs tabular-nums">
          <span>
            база <b>{formatXp(reward.base)}</b>
          </span>
          <span className="text-emerald-700">
            + бонус за качество <b>{formatXp(reward.qualityBonus)}</b>
            <span className="text-muted-foreground"> (оценка {reward.score ?? 100})</span>
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="relative inline-grid font-bold text-amber-900">
            <span className="col-start-1 row-start-1" style={leveledUp ? { animation: `xp-fade-out 200ms ease-out ${swap} both` } : undefined}>
              Ур. {from.level}
            </span>
            {leveledUp && (
              <span className="col-start-1 row-start-1" style={{ animation: `xp-fade-in 200ms ease-out ${swap} both` }}>
                Ур. {to.level}
              </span>
            )}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-amber-100">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={barStyle} />
          </div>
          <span className="tabular-nums text-muted-foreground">
            {formatXp(to.levelXp)} / {formatXp(to.nextLevelXp)}
          </span>
        </div>

        {leveledUp && (
          <div
            className="mt-3 rounded-xl bg-[linear-gradient(110deg,#f59e0b,45%,#fde68a,55%,#f97316)] bg-[length:200%_100%] px-3 py-2 text-center text-base font-extrabold text-white shadow-lg ring-2 ring-amber-200 [text-shadow:0_1px_2px_rgba(0,0,0,.35)]"
            style={{ animation: `xp-pop 500ms ease-out ${swap} both, xp-shine 1.6s linear ${swap} infinite` }}
          >
            Новый уровень {to.level} · {to.title}!
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
