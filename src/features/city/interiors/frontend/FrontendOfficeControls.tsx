"use client";

import { Button } from "@/components/ui/button";
import { actions } from "@/lib/client-store";
import { DEPARTMENT_COMPANY } from "../../companies";
import { sceneActions, useScene } from "../../sceneState";
import { FRONTEND_FLOORS, FRONTEND_ID, frontendFloorIndex } from "./layout";

const COMPANY = DEPARTMENT_COMPANY["Frontend Development"];

export function FrontendOfficeControls() {
  const interior = useScene((s) => s.interior);
  const fade = useScene((s) => s.fade);
  const elevator = useScene((s) => s.elevator);
  if (!interior || interior.placeId !== FRONTEND_ID) return null;
  const floor = frontendFloorIndex(interior.floor);
  const changeFloor = (index: number) => {
    sceneActions.openElevator(false);
    if (index === floor || fade) return;
    actions.clearMoveTarget();
    actions.closePanel();
    sceneActions.goFloor(index - 1);
  };
  const buttons = FRONTEND_FLOORS.map((f, index) => (
    <button key={f.name} type="button" disabled={fade} aria-pressed={floor === index} onClick={() => changeFloor(index)}
      className={`flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-2 text-xs transition-colors disabled:opacity-50 ${floor === index ? "bg-teal-800 text-white" : "bg-stone-100 text-stone-700 hover:bg-teal-50"}`}>
      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-black/10 font-semibold">{index + 1}</span>{f.name}
    </button>
  ));
  return <>
    <div className="pointer-events-auto absolute right-4 top-20 z-10 w-[310px] rounded-2xl border border-stone-200 bg-white/95 p-3 text-stone-800 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div><div className="text-[10px] font-semibold tracking-[0.1em] text-teal-700">{COMPANY} · ОФИС КОМПАНИИ</div><div className="mt-1 text-base font-semibold">{floor + 1} этаж · {FRONTEND_FLOORS[floor].name}</div></div>
        <Button size="sm" variant="outline" disabled={fade} onClick={() => sceneActions.exit()}>Выйти · Esc</Button>
      </div>
      <nav className="grid grid-cols-3 gap-1" aria-label={`Этажи офиса ${COMPANY}`}>{buttons}</nav>
      <p className="mt-2 text-xs text-stone-500">{FRONTEND_FLOORS[floor].subtitle}</p>
      <div className="mt-3 flex flex-col gap-2 border-t border-stone-100 pt-3">
        <span className="text-[11px] text-stone-500">WASD / клик — идти · E — действие</span>
        <button type="button" onClick={() => actions.openPanel("office", FRONTEND_ID)} className="text-xs font-medium text-teal-800 hover:underline">Карьерная траектория →</button>
      </div>
    </div>
    {elevator && <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-slate-950/35" onClick={() => sceneActions.openElevator(false)}>
      <section role="dialog" aria-modal="true" aria-label={`Лифт ${COMPANY}`} className="w-[490px] rounded-2xl bg-white p-6 text-stone-800 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 text-lg font-semibold">Лифт · {COMPANY}</div><p className="mb-5 text-sm text-stone-500">Выберите этаж здания</p>
        <div className="grid grid-cols-3 gap-2">{buttons}</div>
        <button type="button" className="mt-5 text-sm text-stone-500 hover:text-stone-900" onClick={() => sceneActions.openElevator(false)}>Закрыть · Esc</button>
      </section>
    </div>}
  </>;
}
