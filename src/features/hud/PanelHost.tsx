"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { actions, useClientStore } from "@/lib/client-store";
import { PANELS } from "@/panels";

/** правая колонка с панелью из реестра; без затемнения и фокус-ловушки — город остаётся живым */
export function PanelHost() {
  const open = useClientStore((s) => s.openPanel);
  if (!open) return null;
  const Panel = PANELS[open.panel];
  // лист героя — свой полноэкранный оверлей, без правой колонки
  if (open.panel === "character") return <Panel placeId={open.placeId} />;

  return (
    <Card className="pointer-events-auto absolute top-16 right-3 bottom-3 w-[420px] gap-0 bg-white/95 py-0 shadow-lg backdrop-blur">
      <Button
        size="icon-sm"
        variant="ghost"
        className="absolute top-2 right-2 z-10"
        aria-label="Закрыть"
        onClick={() => actions.closePanel()}
      >
        <X />
      </Button>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-4 pr-10">
          <Panel key={`${open.panel}:${open.placeId ?? ""}`} placeId={open.placeId} />
        </div>
      </ScrollArea>
    </Card>
  );
}
