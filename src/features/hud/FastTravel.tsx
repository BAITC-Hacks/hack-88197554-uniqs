"use client";

import type { LucideIcon } from "lucide-react";
import { Award, Building, Coffee, GraduationCap, Hammer, Landmark, Tent, TrainFront, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { actions, useClientStore } from "@/lib/client-store";
import type { EventType } from "@/lib/types";
import { officeOf, venueOf } from "@/lib/world";

const VENUE_BUTTONS: { eventType: EventType; short: string; icon: LucideIcon }[] = [
  { eventType: "course", short: "Академия", icon: GraduationCap },
  { eventType: "workshop", short: "Мастерские", icon: Hammer },
  { eventType: "mentoring", short: "Кофейня", icon: Coffee },
  { eventType: "certification", short: "Экзамены", icon: Award },
  { eventType: "meetup", short: "Амфитеатр", icon: Users },
  { eventType: "onboarding", short: "Вокзал", icon: TrainFront },
  { eventType: "compliance", short: "ЦОН", icon: Landmark },
];

function TravelButton({ placeId, title, short, icon: Icon }: { placeId: string; title: string; short: string; icon: LucideIcon }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button size="xs" variant="ghost" />}
        onClick={() => actions.travelTo(placeId)}
      >
        <Icon />
        {short}
      </TooltipTrigger>
      <TooltipContent side="bottom">{title}</TooltipContent>
    </Tooltip>
  );
}

export function FastTravel() {
  const department = useClientStore((s) => s.profile?.employee.department);
  const tower = department ? officeOf(department) : null;

  return (
    <div className="flex items-center">
      {tower && <TravelButton placeId={tower.id} title={tower.name} short="Моя башня" icon={Building} />}
      <TravelButton placeId="mentor" title="Юрта наставника" short="Юрта" icon={Tent} />
      {VENUE_BUTTONS.map((v) => {
        const place = venueOf(v.eventType);
        return <TravelButton key={place.id} placeId={place.id} title={place.name} short={v.short} icon={v.icon} />;
      })}
    </div>
  );
}
