"use client";

import { useMemo } from "react";
import type { Place } from "@/lib/types";
import { GEO, Instances, PALETTE, Part, Sign, mat, type Item } from "./kit";
import { CITY, Model } from "./models";

const HALF_PI = Math.PI / 2;

/** юрта наставника: войлок, орнаментный пояс, кереге, шанырак, дверь на +z */
export function Yurt() {
  const ornaments = useMemo(() => {
    const items: Item[] = [];
    const n = 28;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      items.push({ p: [Math.sin(a) * 2.95, 1.55, Math.cos(a) * 2.95], s: [0.32, 0.32, 0.08], r: a, color: k % 2 ? "#c8553d" : "#e8b04a" });
    }
    return items;
  }, []);
  return (
    <group>
      <Part geo="cyl" size={[3.3, 0.18, 3.3]} color={PALETTE.stone} />
      <Part geo="cyl" position={[0, 0.18, 0]} size={[2.9, 2.0, 2.9]} color="#f6f1e6" flat={false} />
      <Part geo="cyl" position={[0, 1.35, 0]} size={[2.93, 0.4, 2.93]} color="#c8553d" flat={false} shadow={false} />
      <Instances geometry={GEO.box} material={mat(PALETTE.white)} items={ornaments} shadow={false} />
      <Part geo="cone" position={[0, 2.15, 0]} size={[3.25, 1.85, 3.25]} color="#efe6d3" />
      <Part geo="cone" position={[0, 2.12, 0]} size={[3.32, 0.35, 3.32]} color="#c8553d" shadow={false} />
      <Part geo="torus" position={[0, 3.98, 0]} rotation={[HALF_PI, 0, 0]} size={[0.55, 0.55, 0.55]} color={PALETTE.wood} center />
      <Part geo="cyl" position={[0, 3.9, 0]} size={[0.6, 0.12, 0.6]} color={PALETTE.wood} />
      <Part center position={[0, 3.98, 0]} size={[1.05, 0.06, 0.08]} color={PALETTE.wood} shadow={false} />
      <Part center position={[0, 3.98, 0]} rotation={[0, HALF_PI, 0]} size={[1.05, 0.06, 0.08]} color={PALETTE.wood} shadow={false} />
      {/* дверь */}
      <Part position={[0, 0.18, 2.72]} size={[1.5, 2.05, 0.35]} color="#e0a94a" />
      <Part position={[0, 0.18, 2.85]} size={[1.1, 1.85, 0.3]} color="#5b3222" />
      <Part position={[0, 1.0, 3.02]} size={[0.06, 0.3, 0.06]} color="#e8b04a" shadow={false} />
      <Part position={[0, 0.02, 3.4]} size={[2.2, 0.06, 1.4]} color="#b8473a" shadow={false} />
      <Part position={[0, 0.05, 3.4]} size={[1.6, 0.04, 0.9]} color="#e8b04a" shadow={false} />
    </group>
  );
}

const HOME_MODELS = [CITY.buildingA, CITY.buildingB, CITY.buildingF, CITY.buildingB, CITY.buildingA, CITY.buildingF];

/** дом на окраине: домик KayKit на мощёном участке с кустами */
export function Home({ place }: { place: Place }) {
  const i = Number(place.id.split("-")[1] ?? 0) % HOME_MODELS.length;
  return (
    <group>
      <Part size={[6.5, 0.12, 6]} color={PALETTE.sidewalk} shadow={false} />
      <Model url={HOME_MODELS[i]} position={[0, 0.12, -0.5]} scale={2.4} />
      <Model url={CITY.bush} position={[-2.4, 0.12, 2.2]} scale={2} rotation={[0, i, 0]} />
      <Model url={CITY.bush} position={[2.4, 0.12, 2]} scale={1.8} rotation={[0, i * 2, 0]} />
      {i % 2 === 0 && <Model url={CITY.bench} position={[2.3, 0.12, 0.6]} scale={2.6} rotation={[0, -HALF_PI, 0]} />}
    </group>
  );
}

const SOON_HEIGHTS: Record<string, number> = { "soon-1": 8.5, "soon-2": 11.5, "soon-3": 9.5 };

export function soonHeight(place: Place) {
  return SOON_HEIGHTS[place.id] ?? 9;
}

/** бизнес-центр «Скоро»: серый корпус в лесах, на среднем — кран */
export function Soon({ place }: { place: Place }) {
  const h = soonHeight(place);
  const levels = Math.floor(h / 2.5);
  const scaffold = useMemo(() => {
    const items: Item[] = [];
    for (let l = 0; l <= levels; l++) {
      const y = l * 2.5;
      items.push({ p: [0, y + 0.05, 3.3], s: [7.4, 0.1, 0.9] });
      for (const x of [-3.5, -1.2, 1.2, 3.5]) items.push({ p: [x, y + 1.3, 3.3], s: [0.08, 2.6, 0.08] });
      items.push({ p: [0, y + 2.4, 3.6], s: [7.4, 0.08, 0.08] });
    }
    return items;
  }, [levels]);
  return (
    <group>
      <Part size={[6.8, h, 5.8]} color={PALETTE.grey} />
      {Array.from({ length: levels }, (_, i) => (
        <Part key={i} position={[0, 2.5 * (i + 1) - 0.2, 0]} size={[6.9, 0.2, 5.9]} color={PALETTE.greyDark} shadow={false} />
      ))}
      {Array.from({ length: levels }, (_, i) =>
        [-2.2, 0, 2.2].map((x) => <Part key={`${i}-${x}`} position={[x, 2.5 * i + 0.8, 2.9]} size={[1.4, 1.2, 0.05]} color={PALETTE.dark} shadow={false} />),
      )}
      <Instances geometry={GEO.box} material={mat("#c9843a")} items={scaffold} />
      <Sign text="Скоро" color="#e7b23a" width={3} height={0.8} position={[0, 1.6, 3.85]} />
      <Model url={CITY.dumpster} position={[-4.6, 0, 2.2]} scale={3} />
      <Model url={CITY.boxA} position={[4.4, 0, 2.6]} scale={3} />
      {place.id === "soon-2" && (
        <group position={[2.8, 0, -2.4]}>
          <Part size={[0.5, h + 6, 0.5]} color="#f2b33d" />
          <Part position={[-2.4, h + 6, 0]} size={[9, 0.45, 0.45]} color="#f2b33d" />
          <Part position={[1.6, h + 5.3, 0]} size={[1.2, 0.8, 0.8]} color={PALETTE.dark} />
          <Part geo="cyl8" position={[-5.6, h + 3.2, 0]} size={[0.03, 2.8, 0.03]} color={PALETTE.dark} shadow={false} />
          <Part position={[-5.6, h + 2.6, 0]} size={[0.5, 0.6, 0.5]} color={PALETTE.dark} />
        </group>
      )}
    </group>
  );
}
