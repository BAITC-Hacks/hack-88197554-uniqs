"use client";

import { actions } from "@/lib/client-store";
import { sceneActions, useScene } from "../../sceneState";
import { BACKEND_FLOORS, BACKEND_ID, backendFloorIndex } from "./layout";

export function BackendOfficeControls() {
  const interior = useScene((s) => s.interior);
  const elevator = useScene((s) => s.elevator);
  const fade = useScene((s) => s.fade);
  const floor = backendFloorIndex(interior?.floor ?? -1);
  function travel(index: number) {
    sceneActions.openElevator(false);
    if (index !== floor) {
      actions.closePanel();
      actions.clearMoveTarget();
      sceneActions.goFloor(index);
    }
  }
  return <>
    <section aria-label="Этажи Backend" className="pointer-events-auto absolute bottom-5 left-5 z-10 flex max-w-[calc(100%-40px)] flex-wrap items-center gap-4 rounded-2xl border border-stone-200 bg-white/95 px-5 py-3 text-stone-800 shadow-lg">
      <div className="mr-2"><div className="text-xs font-semibold tracking-widest text-emerald-800">BACKEND · {floor + 1} ЭТАЖ</div><div className="text-sm font-medium">{BACKEND_FLOORS[floor].name}</div></div>
      <nav aria-label="Выбор этажа Backend" className="flex gap-1.5">{BACKEND_FLOORS.map((item, i) => <button key={i} type="button" disabled={fade} aria-current={i === floor ? "page" : undefined} onClick={() => travel(i)} className={`rounded-lg px-3 py-2 text-xs transition-colors disabled:opacity-50 ${i === floor ? "bg-emerald-800 text-white" : "bg-stone-100 hover:bg-stone-200"}`}>{i + 1} · {item.name}</button>)}</nav>
      <button type="button" className="text-xs font-medium text-emerald-800 hover:underline" onClick={() => actions.openPanel("office", BACKEND_ID)}>Карьерная траектория</button>
      <button type="button" disabled={fade} className="rounded-lg border border-stone-200 px-3 py-2 text-xs hover:bg-stone-100 disabled:opacity-50" onClick={() => sceneActions.exit()}>Выйти · Esc</button>
    </section>
    {elevator && <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-slate-950/40" onClick={() => sceneActions.openElevator(false)}>
      <section role="dialog" aria-modal="true" aria-label="Лифт Backend" className="w-[440px] rounded-2xl bg-white p-6 text-stone-800 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 text-lg font-semibold">Лифт · Backend</div><p className="mb-4 text-sm text-stone-500">Четыре этажа компании</p>
        <div className="flex flex-col-reverse gap-2">{BACKEND_FLOORS.map((item, i) => <button key={i} type="button" disabled={fade} onClick={() => travel(i)} className={`rounded-xl border px-4 py-3 text-left disabled:opacity-50 ${i === floor ? "border-emerald-800 bg-emerald-800 text-white" : "border-stone-200 hover:bg-stone-50"}`}><div className="text-sm font-medium">{i + 1} · {item.name}{i === floor ? " · Вы здесь" : ""}</div><div className="mt-1 text-xs opacity-70">{item.subtitle}</div></button>)}</div>
        <button type="button" className="mt-4 text-sm text-stone-500" onClick={() => sceneActions.openElevator(false)}>Закрыть · Esc</button>
      </section>
    </div>}
  </>;
}
