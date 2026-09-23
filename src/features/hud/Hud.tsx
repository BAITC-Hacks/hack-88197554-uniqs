"use client";

import { useEffect } from "react";
import { actions } from "@/lib/client-store";
import { InteractHint } from "./InteractHint";
import { PanelHost } from "./PanelHost";
import { ProfileChip } from "./ProfileChip";
import { TopBar } from "./TopBar";
import { useHotkeys } from "./useHotkeys";

/** оверлей над Canvas: сам корень прозрачен для кликов, ловят только контролы */
export function Hud() {
  useHotkeys();

  useEffect(() => {
    void (async () => {
      await actions.loadEmployees();
      await actions.refreshProfile();
    })();
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div className="absolute inset-x-3 top-3">
        <TopBar />
        <div className="mt-2 w-fit">
          <ProfileChip />
        </div>
      </div>
      <InteractHint />
      <PanelHost />
    </div>
  );
}
