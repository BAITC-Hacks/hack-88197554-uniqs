"use client";

import { ArrowLeft, ArrowRight, Building, ChartColumn, GraduationCap, Sparkles, Tent, TrendingUp, Upload, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STEPS } from "./content";

const ICONS: Record<string, LucideIcon> = {
  about: Sparkles,
  city: Building,
  venues: GraduationCap,
  mentor: Tent,
  progress: TrendingUp,
  hr: ChartColumn,
  upload: Upload,
};

// Змейка: три узла сверху, поворот через вершину дуги, три узла снизу.
const W = 800;
const H = 280;
const R = 70;
const ARC = Math.PI * R;
const PATH = `M80 60 H640 A${R} ${R} 0 0 1 640 200 H80`;
const TOTAL = 560 + ARC + 560;
const NODES: { x: number; y: number; at: number }[] = [
  { x: 80, y: 60, at: 0 },
  { x: 290, y: 60, at: 210 },
  { x: 500, y: 60, at: 420 },
  { x: 640 + R, y: 130, at: 560 + ARC / 2 },
  { x: 500, y: 200, at: 560 + ARC + 140 },
  { x: 290, y: 200, at: 560 + ARC + 350 },
  { x: 80, y: 200, at: TOTAL },
];

export function Roadmap({ step, onStep, onFinish }: { step: number; onStep: (i: number) => void; onFinish: () => void }) {
  const current = STEPS[step];
  const Icon = ICONS[current.id];
  const last = step === STEPS.length - 1;

  return (
    <div className="flex h-full min-h-0 flex-col px-10 pb-8 pt-7">
      <div>
        <p className="text-sm text-emerald-300">Добро пожаловать</p>
        <h1 className="mt-1 text-2xl font-semibold">Как устроен Career Quest</h1>
      </div>

      <div className="relative mt-6 w-full" style={{ aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" aria-hidden>
          <path d={PATH} fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth={6} strokeLinecap="round" />
          <path
            d={PATH}
            fill="none"
            stroke="rgb(52 211 153)"
            strokeWidth={6}
            strokeLinecap="round"
            pathLength={TOTAL}
            strokeDasharray={TOTAL}
            strokeDashoffset={TOTAL - NODES[step].at}
            style={{ transition: "stroke-dashoffset 700ms ease-in-out" }}
          />
        </svg>
        {STEPS.map((s, i) => {
          const NodeIcon = ICONS[s.id];
          const n = NODES[i];
          const state = i < step ? "done" : i === step ? "active" : "next";
          return (
            <div
              key={s.id}
              className="absolute flex -translate-x-1/2 -translate-y-6 flex-col items-center gap-1.5"
              style={{ left: `${(n.x / W) * 100}%`, top: `${(n.y / H) * 100}%` }}
            >
              <button
                type="button"
                aria-label={`Шаг ${i + 1}: ${s.title}`}
                aria-current={state === "active" ? "step" : undefined}
                onClick={() => onStep(i)}
                className={`relative grid size-12 place-items-center rounded-full border-2 transition-all duration-500 ${
                  state === "done"
                    ? "border-emerald-300 bg-emerald-500 text-white hover:bg-emerald-400"
                    : state === "active"
                      ? "scale-110 border-emerald-300 bg-white text-slate-900 shadow-[0_0_24px_rgb(52_211_153/0.6)]"
                      : "border-white/15 bg-slate-800 text-slate-400 hover:border-white/40 hover:text-white"
                }`}
              >
                {state === "active" && <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/40" />}
                <NodeIcon className="relative size-5" />
              </button>
              <span className={`whitespace-nowrap text-xs font-medium transition-colors duration-500 ${state === "next" ? "text-slate-500" : "text-slate-200"}`}>
                {s.title}
              </span>
            </div>
          );
        })}
      </div>

      <div key={current.id} className="mt-6 flex min-h-0 flex-1 gap-5 rounded-2xl border border-white/10 bg-white/5 p-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
        <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-emerald-400/15 text-emerald-300">
          <Icon className="size-7" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Шаг {step + 1} из {STEPS.length}</p>
          <h2 className="mt-1 text-xl font-semibold">{current.title}</h2>
          <p className="mt-2 max-w-xl text-base leading-relaxed text-slate-300">{current.text}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" className="text-slate-300 hover:bg-white/10 hover:text-white" disabled={step === 0} onClick={() => onStep(step - 1)}>
          <ArrowLeft />Назад
        </Button>
        <span className="text-xs text-slate-500">← → листать · Esc — пропустить</span>
        {last
          ? <Button size="lg" className="h-12 bg-emerald-500 px-8 text-base text-white hover:bg-emerald-400 animate-in fade-in-0 zoom-in-95 duration-500" onClick={onFinish}>
            Выбрать персонажа<ArrowRight />
          </Button>
          : <Button size="lg" className="bg-white px-5 text-slate-900 hover:bg-slate-200" onClick={() => onStep(step + 1)}>
            Дальше<ArrowRight />
          </Button>}
      </div>
    </div>
  );
}
