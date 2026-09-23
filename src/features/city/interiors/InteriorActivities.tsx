"use client";

import { BookOpen, ClipboardList, MessageCircle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { actions, useClientStore } from "@/lib/client-store";
import { getPlace } from "@/lib/world";
import { useScene } from "../sceneState";
import { openIndoorActivity } from "./ActivitySpot";

export function InteriorActivities() {
  const interior = useScene((s) => s.interior);
  const locked = useScene((s) => s.controlsLocked);
  const fade = useScene((s) => s.fade);
  const panel = useClientStore((s) => s.openPanel);
  const place = getPlace(interior?.placeId ?? "");
  if (!place || locked || panel || (place.kind !== "office" && place.kind !== "venue")) return null;
  return <section aria-label="Занятия в здании" className="pointer-events-auto absolute bottom-28 left-5 z-10 w-[278px] rounded-2xl border border-emerald-100 bg-white/95 p-4 text-stone-800 shadow-lg">
    <div className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Чем займёмся?</div>
    <p className="mb-3 mt-1 text-xs leading-5 text-stone-500">Зелёные метки — занятия. Подойди и нажми E или выбери здесь.</p>
    <div className="flex flex-col gap-2">
      <Button disabled={fade} className="justify-start" onClick={() => openIndoorActivity(place.kind === "venue" ? "venue" : "practice", place.id)}><Play className="size-4" />{place.kind === "venue" ? "Выбрать занятие" : "Решить практическую задачу"}</Button>
      {place.kind === "office" && <Button disabled={fade} variant="outline" className="justify-start" onClick={() => openIndoorActivity("course")}><BookOpen className="size-4" />Пройти обучение</Button>}
      <Button disabled={fade} variant="outline" className="justify-start" onClick={() => openIndoorActivity("mentor")}><MessageCircle className="size-4" />Обсудить следующий шаг</Button>
      <Button disabled={fade} variant="ghost" className="justify-start" onClick={() => actions.openPanel("quests")}><ClipboardList className="size-4" />Мои квесты</Button>
    </div>
    <p className="mt-3 text-[11px] text-stone-500">WASD — ходить · колесо — приблизить</p>
  </section>;
}
