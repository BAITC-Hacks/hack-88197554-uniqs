"use client";

import { Compass, Map, ScrollText, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HeroButton } from "@/features/character/HeroButton";
import { actions, useClientStore } from "@/lib/client-store";
import { CareerExplorer } from "@/features/career/CareerExplorer";

export function TopBar({ onMap, onLobby }: { onMap: () => void; onLobby: () => void }) {
  const questCount = useClientStore((s) => s.acceptedQuests.length);

  return (
    <header className="pointer-events-auto flex h-14 items-center gap-4 rounded-xl bg-white/95 px-5 shadow-sm ring-1 ring-foreground/10">
      <span className="font-heading mr-3 text-base font-semibold">Город карьеры</span>
      <Button variant="ghost" onClick={onMap}><Map />Карта</Button>
      <Button variant="ghost" onClick={() => actions.openPanel("mentor", "mentor")}><Compass />Наставник</Button>
      <HeroButton />
      <Button size="sm" variant="outline" title="Клавиша J" onClick={() => actions.openPanel("quests")}>
        <ScrollText />
        Мой план <kbd className="text-muted-foreground">J</kbd>
        {questCount > 0 && <Badge className="ml-0.5">{questCount}</Badge>}
      </Button>
      <CareerExplorer />
      <div className="flex-1" />
      <Button size="sm" variant="ghost" onClick={onLobby}><UsersRound />Сменить сотрудника</Button>
    </header>
  );
}
