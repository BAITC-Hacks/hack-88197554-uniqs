"use client";

import { Button } from "@/components/ui/button";
import { actions, useClientStore } from "@/lib/client-store";
import { getPlace, panelForPlace } from "@/lib/world";
import { sceneActions, useScene } from "../sceneState";
import { officePlanFor, usesOfficePlan } from "./officePlans";
import { FrontendOfficeControls } from "./frontend/FrontendOfficeControls";

export function InteriorControls() {
  const interior = useScene((s) => s.interior);
  const fade = useScene((s) => s.fade);
  const locked = useScene((s) => s.controlsLocked);
  const nearId = useClientStore((s) => s.nearPlaceId);
  const place = getPlace(interior?.placeId ?? nearId ?? "");
  if (!place || locked) return null;
  if (!interior) return (
    <div className="pointer-events-auto absolute bottom-16 left-1/2 z-10 -translate-x-1/2">
      <Button disabled={fade} onClick={() => sceneActions.enter(place.id)}>Войти · {place.name}</Button>
    </div>
  );
  if (place.id === "office-frontend") return <FrontendOfficeControls />;
  const action = place.kind === "mentor" ? "Наставник" : place.kind === "venue" ? "Активности" : place.kind === "office" ? "Карьерная траектория" : "Информация";
  return (
    <div className="pointer-events-auto absolute top-20 left-[340px] z-10 flex items-center gap-4 rounded-xl bg-white/95 px-4 py-3 text-slate-800 shadow-sm ring-1 ring-black/10">
      <div><div className="text-sm font-medium">{place.name}</div><div className="text-xs text-slate-500">{usesOfficePlan(place) ? `${officePlanFor(place).title} · ` : ""}WASD — ходить</div></div>
      <Button size="sm" variant="outline" onClick={() => actions.openPanel(panelForPlace(place), place.id)}>{action}</Button>
      <Button size="sm" disabled={fade} onClick={() => sceneActions.exit()}>Выйти · Esc</Button>
    </div>
  );
}
