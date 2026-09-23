"use client";

import { useEffect, useState } from "react";
import { actions, getState } from "@/lib/client-store";
import { getScene, sceneActions, useScene } from "@/features/city/sceneState";
import { CityMap } from "./CityMap";
import { Lobby } from "./Lobby";
import { NextStep } from "./NextStep";
import { useNextStep } from "./useNextStep";
import { InteractHint } from "./InteractHint";
import { PanelHost } from "./PanelHost";
import { ProfileChip } from "./ProfileChip";
import { TopBar } from "./TopBar";
import { TourCard } from "./TourCard";
import { tourActions } from "./tour";
import { useHotkeys } from "./useHotkeys";

/** оверлей над Canvas: сам корень прозрачен для кликов, ловят только контролы */
export function Hud() {
  const [lobby, setLobby] = useState(true);
  const [map, setMap] = useState(false);
  const next = useNextStep();
  const fade = useScene((s) => s.fade);
  useHotkeys(!lobby && !map);

  useEffect(() => { sceneActions.lockControls(lobby || map); }, [lobby, map]);

  useEffect(() => {
    void (async () => {
      await actions.loadEmployees();
      await actions.refreshProfile();
    })();
  }, []);

  function start(recommend: boolean) {
    const profile = getState().profile;
    if (!profile || fade) return;
    setLobby(false);
    // В город входим на улицу: там встречает наставник и ведёт тур.
    if (getScene().mode === "interior") sceneActions.exit();
    tourActions.start();
    if (recommend) void next.recommend();
  }

  /** «Веди»: стрим наставника виден в NextStep, пока идём к башне */
  function guide() {
    if (!next.busy && !next.finished) void next.recommend();
  }

  function changeEmployee() {
    tourActions.reset();
    next.cancel();
    actions.closePanel();
    actions.clearMoveTarget();
    setMap(false);
    setLobby(true);
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {lobby ? <Lobby onStart={start} transitioning={fade} /> : <>
      <div className="absolute inset-x-3 top-3">
        <TopBar onMap={() => { actions.closePanel(); setMap(true); }} onLobby={changeEmployee} />
        <div className="mt-2 flex w-fit flex-col gap-3">
          <ProfileChip />
          <NextStep request={next} />
        </div>
      </div>
      <InteractHint />
      <TourCard onGuide={guide} />
      <PanelHost />
      <CityMap open={map} onOpenChange={setMap} />
      </>}
    </div>
  );
}
