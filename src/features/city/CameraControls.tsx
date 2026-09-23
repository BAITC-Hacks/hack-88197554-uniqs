"use client";

import { Eye, ScanEye } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useClientStore } from "@/lib/client-store";
import { cameraInputBlocked, setCameraMode, toggleCameraMode, useCameraMode } from "./cameraState";
import { useScene } from "./sceneState";

export function CameraControls() {
  const mode = useCameraMode();
  const locked = useScene((s) => s.controlsLocked);
  const fade = useScene((s) => s.fade);
  const elevator = useScene((s) => s.elevator);
  const panel = useClientStore((s) => s.openPanel);
  const hint = useScene((s) => s.hint);
  const firstPerson = mode === "first-person";

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "KeyV" || event.repeat || event.ctrlKey || event.metaKey || event.altKey || cameraInputBlocked()) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest("input, textarea, select, [role=dialog]"))) return;
      event.preventDefault();
      toggleCameraMode();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (locked || panel || elevator) return null;
  return <>
    {firstPerson && !fade && <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
      <div className="mx-auto size-1.5 rounded-full bg-white/90 shadow-[0_0_0_1px_#0005]" />
      {hint && <div className="absolute left-1/2 top-6 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900/85 px-3 py-1.5 text-xs text-white"><kbd className="mr-2 font-semibold">E</kbd>{hint.label}</div>}
    </div>}
    <section aria-label="Режим камеры" className="pointer-events-auto absolute bottom-24 right-5 z-10 w-[300px] rounded-xl bg-white/95 p-3 text-slate-800 shadow-sm ring-1 ring-black/10">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-500"><span>Камера</span><kbd className="rounded bg-slate-100 px-1.5 py-0.5">V</kbd></div>
      <div className="flex gap-1.5">
        <Button size="sm" variant={!firstPerson ? "default" : "ghost"} aria-pressed={!firstPerson} disabled={fade} onClick={() => setCameraMode("overview")}><ScanEye />Обзор</Button>
        <Button size="sm" variant={firstPerson ? "default" : "ghost"} aria-pressed={firstPerson} disabled={fade} onClick={() => setCameraMode("first-person")}><Eye />От первого лица</Button>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">{firstPerson ? "Зажмите мышь и ведите — осмотреться. WASD — идти, Shift — бег, E — действие." : "Колесо мыши — масштаб. WASD или клик по земле — идти."}</p>
    </section>
  </>;
}
