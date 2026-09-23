"use client";

// Кофейня наставников: бар с кофемашиной и бариста, столики, люстра, доска сессий менторинга.

import { useCallback, useRef } from "react";
import { actions } from "@/lib/client-store";
import type { Place } from "@/lib/types";
import { Character } from "../Character";
import { PALETTE, Part } from "../kit";
import { FURNITURE, Model, RESTAURANT } from "../models";
import { sceneActions } from "../sceneState";
import { Chandelier, CoffeeMachine, TextBoard } from "./props";
import { Blocker, Interactable, Room, SeatSpot } from "./Room";

const TABLES: { x: number; z: number; npc?: number[] }[] = [
  { x: -4.5, z: -1.5, npc: [0, 1] },
  { x: 0, z: -1.5 },
  { x: 4.5, z: -1.5 },
  { x: -4.5, z: 2.5 },
  { x: 4.5, z: 2.5, npc: [1] },
];

export function Cafe({ place }: { place: Place }) {
  const coffee = useRef(0);
  const openPanel = useCallback(() => actions.openPanel("venue", place.id), [place.id]);
  const brew = useCallback(() => {
    coffee.current = performance.now() + 3000;
    sceneActions.gesture("interact");
    sceneActions.say("barista", ["☕ Наставник-эспрессо. Крепкий, как критичный навык.", "☕ Латте с корицей — для долгого разговора о карьере.", "☕ Раф. Бесплатно для тех, кто закрыл квест."][Math.floor(Math.random() * 3)]);
  }, []);

  return (
    <Room w={16} d={14} floor="#b98a5e" wall="#f2e6d3" trim="#8a5a3c" spawn={[0, 5.4]}>
      {/* бар вдоль задней стены */}
      {[-3, -1, 1, 3].map((x, i) => (
        <Model key={i} url={i === 1 ? RESTAURANT.counterSink : i === 3 ? RESTAURANT.counter : RESTAURANT.counterPlain} position={[x, 0, -5.8]} scale={[1, 0.95, 0.9]} rotation={[0, Math.PI, 0]} />
      ))}
      <Blocker x={-2} z={-5.8} r={2.2} />
      <Blocker x={2} z={-5.8} r={2.2} />
      <CoffeeMachine position={[-3.1, 0.95, -5.8]} active={coffee} />
      <Interactable id="barista" label="Кофемашина: сварить" position={[-3.1, 0, -4.5]} radius={1.7} onInteract={brew} />
      <Model url={RESTAURANT.dishrack} position={[1.1, 0.96, -5.9]} scale={0.8} />
      <Model url={RESTAURANT.plate} position={[3.2, 0.96, -5.7]} scale={0.8} />
      <Model url={RESTAURANT.menu} position={[-1, 0.96, -5.6]} scale={0.9} rotation={[0, 0.2, 0]} />
      <Model url={RESTAURANT.jarA} position={[-6.5, 0, -6.4]} scale={0.7} />
      <Model url={RESTAURANT.jarB} position={[-6, 0, -6.6]} scale={0.6} />
      <Model url={RESTAURANT.shelf} position={[4.5, 1.6, -6.7]} scale={1} />
      <Model url={RESTAURANT.fridge} position={[6.6, 0, -6]} scale={0.8} rotation={[0, Math.PI, 0]} />
      <Blocker x={6.6} z={-6} r={1} />
      <TextBoard position={[0, 2.3, -6.75]} text="Кофейня наставников" sub="латте · капучино · наставник-эспрессо" color="#8a5a3c" width={6} height={1.4} />
      <group position={[-1.5, 0, -6.55]}>
        <Character model="knight" action="idle" phase={0.3} />
      </group>

      {/* столики */}
      {TABLES.map((t, i) => (
        <group key={i}>
          <Model url={RESTAURANT.tableRoundSmall} position={[t.x, 0, t.z]} scale={0.85} />
          <Blocker x={t.x} z={t.z} r={0.9} />
          <Part geo="cyl" position={[t.x, 0.86, t.z]} size={[0.06, 0.09, 0.06]} color="#ffffff" shadow={false} />
          {[0, 1].map((k) => {
            const yaw = k === 0 ? Math.PI : 0;
            const seat: [number, number, number] = [t.x, 0, t.z + (k === 0 ? 1.0 : -1.0)];
            return (
              <group key={k}>
                <Model url={RESTAURANT.chairA} position={seat} scale={0.85} rotation={[0, yaw + Math.PI, 0]} />
                {t.npc?.includes(k) ? (
                  <group position={seat} rotation={[0, yaw, 0]}>
                    <Character model={k ? "mage" : "rogue"} action="sit" phase={i * 0.3 + k} />
                  </group>
                ) : (
                  <SeatSpot id={`cafe-${i}-${k}`} position={seat} yaw={yaw} label="Сесть за столик" />
                )}
              </group>
            );
          })}
        </group>
      ))}
      <Interactable id="cafe-npc" label="Поговорить" position={[-4.5, 0, 0.2]} radius={1.6} onInteract={() => sceneActions.say("cafe-npc", "Mentor Track — лучшее, что я брал. Наставник объясняет по трём факторам, а не «просто бери курс».")} />

      <Chandelier position={[0, 3.0, 0.5]} radius={1.1} />
      <Model url={FURNITURE.rugRound} position={[0, 0, 0.5]} scale={2.2} />
      <Model url={FURNITURE.cactusA} position={[-7.2, 0, 5.8]} scale={1.1} />
      <Model url={FURNITURE.cactusB} position={[7.2, 0, 5.8]} scale={1.1} />
      <Model url={FURNITURE.pictureMedium} position={[-7.75, 1.8, 0]} scale={1.2} rotation={[0, Math.PI / 2, 0]} />
      <Model url={FURNITURE.pictureLarge} position={[7.75, 1.9, 0]} scale={1.1} rotation={[0, -Math.PI / 2, 0]} />
      <Model url={FURNITURE.lampStanding} position={[7.2, 0, -3.5]} scale={0.9} />

      {/* доска сессий наставников у входа */}
      <TextBoard position={[-7.7, 1.6, 4]} rotation={Math.PI / 2} text="Сессии наставников" sub="менторинг: ближайшие встречи" color="#8a5a3c" width={3.2} height={1.2} />
      <Interactable id="schedule" label="Сессии наставников" position={[-6.6, 0, 4]} radius={1.8} onInteract={openPanel} />
      <Part position={[-7.4, 0, 4]} size={[0.5, 0.05, 2]} color={PALETTE.wood} shadow={false} />
    </Room>
  );
}
