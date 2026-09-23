"use client";

import { ArrowRight, Building2, Compass, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { actions, useClientStore } from "@/lib/client-store";
import { PLACES } from "@/lib/world";
import type { EventType, Place } from "@/lib/types";

const PURPOSE: Record<EventType, string> = { course: "Курсы и развитие навыков", workshop: "Практические занятия", mentoring: "Встречи с наставниками", certification: "Профессиональная сертификация", meetup: "Обмен опытом и выступления", onboarding: "Знакомство с компанией", compliance: "Обязательные программы" };

export function CityMap({ open, onOpenChange }: { open: boolean; onOpenChange: (value: boolean) => void }) {
  const department = useClientStore((s) => s.profile?.employee.department);
  function travel(place: Place) {
    onOpenChange(false);
    actions.travelTo(place.id);
    actions.closePanel();
  }
  function destination(place: Place) {
    const own = place.kind === "office" && place.department === department;
    const Icon = place.kind === "office" ? Building2 : place.kind === "mentor" ? Compass : GraduationCap;
    return <Button key={place.id} variant="outline" onClick={() => travel(place)} className={`h-auto justify-start gap-3 px-3 py-3 text-left whitespace-normal ${own ? "border-slate-700 bg-slate-50" : ""}`}>
      <Icon className="size-4 shrink-0" /><span className="min-w-0 flex-1"><span className="block text-sm">{place.name.replace("Башня ", "")}{own ? " · мой офис" : ""}</span><span className="mt-1 block text-xs font-normal text-muted-foreground">{place.kind === "office" ? "Профиль и карьерная траектория" : place.eventType ? PURPOSE[place.eventType] : "Персональные рекомендации"}</span></span><ArrowRight className="size-3.5" />
    </Button>;
  }
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[85vh] overflow-y-auto p-6 sm:max-w-[920px]">
      <DialogHeader><DialogTitle>Карта города</DialogTitle><DialogDescription>Выберите место — персонаж переместится ко входу. Внутри можно продолжить свой план развития.</DialogDescription></DialogHeader>
      <h3 className="mt-2 text-sm font-medium">Обучение и встречи</h3>
      <div className="grid grid-cols-3 gap-2">{PLACES.filter((p) => p.kind === "mentor" || p.kind === "venue").map(destination)}</div>
      <h3 className="mt-2 text-sm font-medium">Офисы компании</h3>
      <div className="grid grid-cols-3 gap-2">{PLACES.filter((p) => p.kind === "office").map(destination)}</div>
    </DialogContent>
  </Dialog>;
}
