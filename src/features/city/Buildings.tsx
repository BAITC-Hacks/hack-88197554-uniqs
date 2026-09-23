"use client";

import type { Place } from "@/lib/types";
import { PALETTE, Part } from "./kit";
import { ModelOr } from "./models";

const HALF_PI = Math.PI / 2;

/** юрта наставника: белый цилиндр, конус крыши, дверь на +z */
export function Yurt() {
  return (
    <ModelOr kind="mentor">
      <group>
        <Part geo="cyl" size={[2.9, 2.1, 2.9]} color="#f8f4ec" />
        <Part geo="cyl" position={[0, 1.45, 0]} size={[2.94, 0.28, 2.94]} color="#c8553d" shadow={false} />
        <Part geo="cone" position={[0, 2.1, 0]} size={[3.2, 1.7, 3.2]} color="#f1e9da" />
        <Part geo="cyl" position={[0, 3.45, 0]} size={[0.5, 0.25, 0.5]} color={PALETTE.wood} />
        <Part position={[0, 0, 2.8]} size={[1.25, 1.85, 0.3]} color="#e0a94a" />
        <Part position={[0, 0, 2.9]} size={[0.95, 1.65, 0.3]} color="#5b3222" />
      </group>
    </ModelOr>
  );
}

const HOUSE_COLORS = ["#f3d9b1", "#cfe0c3", "#f2c6b4", "#c9d8ea", "#efe2a8", "#dcc9e6"];
const ROOF_COLORS = ["#c9735a", "#7f9a6a", "#b85f55", "#6f8fb3", "#c9965a", "#8f76a8"];

/** дом на окраине: коробка с двускатной крышей */
export function Home({ place }: { place: Place }) {
  const i = Number(place.id.split("-")[1] ?? 0) % HOUSE_COLORS.length;
  return (
    <ModelOr kind="home">
      <group>
        <Part size={[3.2, 2.2, 2.8]} color={HOUSE_COLORS[i]} />
        <Part geo="prism" position={[0, 2.2, 0]} rotation={[0, HALF_PI, 0]} size={[3.2, 1.3, 3.7]} color={ROOF_COLORS[i]} />
        <Part position={[0.9, 1.9, -0.6]} size={[0.4, 1.4, 0.4]} color={PALETTE.stone} />
        <Part position={[-0.6, 0, 1.4]} size={[0.8, 1.5, 0.1]} color={PALETTE.wood} />
        <Part position={[0.75, 0.8, 1.4]} size={[0.8, 0.7, 0.1]} color={PALETTE.glass} />
      </group>
    </ModelOr>
  );
}

const SOON_HEIGHTS: Record<string, number> = { "soon-1": 8.5, "soon-2": 11.5, "soon-3": 9.5 };

export function soonHeight(place: Place) {
  return SOON_HEIGHTS[place.id] ?? 9;
}

/** бизнес-центр «Скоро»: серая коробка в лесах, на среднем — кран */
export function Soon({ place }: { place: Place }) {
  const h = soonHeight(place);
  const levels = Math.floor(h / 2.5);
  return (
    <ModelOr kind="soon">
      <group>
        <Part size={[6.4, h, 5.6]} color={PALETTE.grey} />
        {Array.from({ length: levels }, (_, i) => (
          <Part key={i} position={[0, 2.5 * (i + 1) - 0.2, 0]} size={[6.5, 0.2, 5.7]} color={PALETTE.greyDark} shadow={false} />
        ))}
        <Part position={[0, 0, 2.85]} size={[2.2, 1, 0.1]} color="#e7c14a" />
        {place.id === "soon-2" && (
          <group position={[2.6, 0, -2.2]}>
            <Part size={[0.45, h + 6, 0.45]} color="#f2b33d" />
            <Part position={[-2.2, h + 6, 0]} size={[8, 0.4, 0.4]} color="#f2b33d" />
            <Part position={[1.4, h + 5.3, 0]} size={[1, 0.7, 0.7]} color={PALETTE.dark} />
            <Part geo="cyl8" position={[-5.2, h + 3.2, 0]} size={[0.03, 2.8, 0.03]} color={PALETTE.dark} shadow={false} />
          </group>
        )}
      </group>
    </ModelOr>
  );
}
