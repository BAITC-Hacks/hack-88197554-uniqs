"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScrollText, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { actions, useClientStore } from "@/lib/client-store";
import { NAV } from "@/nav";
import { EmployeeSelect } from "./EmployeeSelect";
import { FastTravel } from "./FastTravel";

export function TopBar() {
  const questCount = useClientStore((s) => s.acceptedQuests.length);
  const pathname = usePathname();

  return (
    <header className="pointer-events-auto flex h-12 items-center gap-2 rounded-xl bg-white/85 px-3 shadow-sm ring-1 ring-foreground/10 backdrop-blur">
      <span className="font-heading text-sm font-semibold whitespace-nowrap">Город карьеры</span>
      <div className="shrink-0">
        <EmployeeSelect />
      </div>
      <div className="flex min-w-0 flex-1 justify-center">
        <FastTravel />
      </div>
      <Button size="sm" variant="outline" title="Клавиша C" onClick={() => actions.openPanel("character")}>
        <UserRound />
        Персонаж <kbd className="text-muted-foreground">C</kbd>
      </Button>
      <Button size="sm" variant="outline" title="Клавиша J" onClick={() => actions.openPanel("quests")}>
        <ScrollText />
        Квесты <kbd className="text-muted-foreground">J</kbd>
        {questCount > 0 && <Badge className="ml-0.5">{questCount}</Badge>}
      </Button>
      <nav className="flex items-center gap-2 text-sm">
        {NAV.filter((n) => n.href !== pathname).map((n) => (
          <Link key={n.href} href={n.href} className="text-muted-foreground hover:text-foreground">
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
