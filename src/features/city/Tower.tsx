"use client";

import { useMemo } from "react";
import { useClientStore } from "@/lib/client-store";
import type { Department, Place } from "@/lib/types";
import { DEPARTMENT_COLOR, TOWER_FLOOR_HEIGHT as H, TOWER_FLOORS, gradeFloor } from "@/lib/world";
import { DEPARTMENT_COMPANY as CO } from "./companies";
import { GEO, Instances, PALETTE, Part, Sign, glass, mat, type Item } from "./kit";
import { CITY, Model } from "./models";

/** высота лобби; этажи-грейды идут над ним */
export const PODIUM_H = 3.8;
const SIDE = 7.4;

type Shape = "box" | "cyl" | "stepped" | "slab";
type Roof = "antenna" | "garden" | "mech" | "crown" | "dish" | "helipad";

interface TowerStyle {
  shape: Shape;
  wall: string;
  glass: string;
  fins?: boolean;
  bands?: boolean;
  balconies?: boolean;
  checker?: boolean;
  roof: Roof;
  short: string;
  /** компания-арендатор башни: главная вывеска над входом */
  company: string;
}

export const TOWER_STYLE: Record<Department, TowerStyle> = {
  "Backend Development": { shape: "box", wall: "#3b4653", glass: "#2c4a6b", fins: true, roof: "antenna", short: "Backend", company: CO["Backend Development"] },
  "Frontend Development": { shape: "slab", wall: "#f3efe6", glass: "#7fc9c1", bands: true, roof: "garden", short: "Frontend", company: CO["Frontend Development"] },
  "Data & Analytics": { shape: "cyl", wall: "#e8e4f2", glass: "#6f63b5", roof: "crown", short: "Data & Analytics", company: CO["Data & Analytics"] },
  "Quality Assurance": { shape: "box", wall: "#efe6cf", glass: "#c9a14a", checker: true, roof: "mech", short: "QA", company: CO["Quality Assurance"] },
  "Product Management": { shape: "stepped", wall: "#f2d9c4", glass: "#d68a5a", roof: "garden", short: "Product", company: CO["Product Management"] },
  "Human Resources": { shape: "box", wall: "#efd6dc", glass: "#c98aa5", balconies: true, roof: "garden", short: "HR", company: CO["Human Resources"] },
  Sales: { shape: "slab", wall: "#e2e8d8", glass: "#8fb56d", roof: "helipad", short: "Sales", company: CO.Sales },
  "Customer Support": { shape: "box", wall: "#dfe8f3", glass: "#5b8fc9", bands: true, roof: "dish", short: "Support", company: CO["Customer Support"] },
};

function floorSide(style: TowerStyle, i: number) {
  return style.shape === "stepped" ? SIDE - i * 0.9 : SIDE;
}

/** башня отдела: лобби-подиум, 4 этажа-грейда со своей архитектурой, этаж сотрудника светится */
export function Tower({ place }: { place: Place }) {
  const profile = useClientStore((s) => s.profile);
  const dept = place.department!;
  const color = DEPARTMENT_COLOR[dept];
  const style = TOWER_STYLE[dept];
  const mine = profile?.employee.department === dept ? profile : null;
  const myFloor = mine ? gradeFloor(mine.employee.grade) : -1;
  const top = PODIUM_H + TOWER_FLOORS * H;

  const details = useMemo(() => buildDetails(style), [style]);

  return (
    <group>
      <Podium color={color} style={style} />
      {Array.from({ length: TOWER_FLOORS }, (_, i) => (
        <Floor key={i} i={i} style={style} lit={i === myFloor} />
      ))}
      <Instances geometry={GEO.box} material={mat(PALETTE.dark, { flat: false })} items={details.mullions} shadow={false} />
      <Instances geometry={GEO.box} material={mat(style.wall)} items={details.fins} />
      <Instances geometry={GEO.box} material={mat(color)} items={details.bands} shadow={false} />
      <RoofTop style={style} color={color} y={top} />
      {mine?.target && <FloorProgress style={style} floor={myFloor + 1} met={mine.gradeProgress.met} total={mine.gradeProgress.total} />}
    </group>
  );
}

function Podium({ color, style }: { color: string; style: TowerStyle }) {
  const w = SIDE + 2.4;
  const d = SIDE + 1.6;
  const z = d / 2;
  return (
    <group>
      {/* стеклянное лобби в раме */}
      <Part size={[w + 0.4, 0.25, d + 0.4]} color={PALETTE.stone} />
      <Part position={[0, 0.25, 0]} size={[w, PODIUM_H - 0.55, d]} material={glass(style.glass, { opacity: 0.85 })} />
      <Part position={[0, PODIUM_H - 0.3, 0]} size={[w + 0.5, 0.3, d + 0.5]} color={style.wall} />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => <Part key={`${sx}${sz}`} position={[(sx * w) / 2, 0, (sz * d) / 2]} size={[0.55, PODIUM_H, 0.55]} color={style.wall} />),
      )}
      {/* вход: рама, две стеклянные створки, ручки */}
      <Part position={[0, 0, z]} size={[3.2, 2.9, 0.35]} color={style.wall} />
      <Part position={[-0.72, 0.05, z + 0.12]} size={[1.25, 2.6, 0.12]} material={glass("#bfe0f0", { opacity: 0.7 })} shadow={false} />
      <Part position={[0.72, 0.05, z + 0.12]} size={[1.25, 2.6, 0.12]} material={glass("#bfe0f0", { opacity: 0.7 })} shadow={false} />
      <Part position={[-0.25, 1.05, z + 0.24]} size={[0.06, 0.6, 0.06]} color={PALETTE.metal} shadow={false} />
      <Part position={[0.25, 1.05, z + 0.24]} size={[0.06, 0.6, 0.06]} color={PALETTE.metal} shadow={false} />
      {/* навес на двух стойках; вывеска компании над входом, табличка отдела на навесе */}
      <Part position={[0, 3.05, z + 0.7]} size={[5.2, 0.18, 2.6]} color={style.wall} />
      <Part position={[0, 3.23, z + 0.7]} size={[5.2, 0.06, 2.6]} color={color} shadow={false} />
      <Part position={[-2.3, 0, z + 1.75]} size={[0.14, 3.05, 0.14]} geo="cyl8" color={PALETTE.metal} />
      <Part position={[2.3, 0, z + 1.75]} size={[0.14, 3.05, 0.14]} geo="cyl8" color={PALETTE.metal} />
      <Sign text={style.company} color={color} width={5.4} height={0.95} position={[0, PODIUM_H + 0.72, z - 0.35]} />
      <Sign text={style.short} color={PALETTE.dark} width={3.4} height={0.46} position={[0, 3.17, z + 2.1]} />
      {/* клумбы у входа */}
      {[-3.3, 3.3].map((x) => (
        <group key={x} position={[x, 0, z + 1.2]}>
          <Part size={[1.6, 0.55, 0.8]} color={PALETTE.stone} />
          <Part position={[0, 0.5, 0]} size={[1.45, 0.1, 0.65]} color="#5a4634" shadow={false} />
          <Model url={CITY.bush} position={[-0.4, 0.55, 0]} scale={2.2} />
          <Model url={CITY.bush} position={[0.42, 0.55, 0.05]} scale={1.9} rotation={[0, 1.2, 0]} />
        </group>
      ))}
      <Model url={CITY.trashA} position={[-4.6, 0, z + 0.9]} scale={3} />
    </group>
  );
}

function Floor({ i, style, lit }: { i: number; style: TowerStyle; lit: boolean }) {
  const y = PODIUM_H + i * H;
  const s = floorSide(style, i);
  const g = glass(style.checker && i % 2 ? PALETTE.glass : style.glass, { lit });
  if (style.shape === "cyl") {
    const r = s / 2;
    return (
      <group position={[0, y, 0]}>
        <Part geo="cyl" size={[r + 0.25, 0.3, r + 0.25]} color={style.wall} />
        <Part geo="cyl" position={[0, 0.3, 0]} size={[r, H - 0.3, r]} material={g} />
        <Part geo="cyl" position={[0, 0.3, 0]} size={[r + 0.04, 0.8, r + 0.04]} color={style.wall} shadow={false} />
      </group>
    );
  }
  const w = style.shape === "slab" ? s * 1.3 : s;
  const d = style.shape === "slab" ? s * 0.72 : s;
  return (
    <group position={[0, y, 0]}>
      <Part size={[w + 0.3, 0.3, d + 0.3]} color={style.wall} />
      <Part position={[0, 0.3, 0]} size={[w, H - 0.3, d]} material={g} />
      <Part position={[0, 0.3, 0]} size={[w + 0.05, 0.8, d + 0.05]} color={style.wall} shadow={false} />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => <Part key={`${sx}${sz}`} position={[(sx * w) / 2, 0, (sz * d) / 2]} size={[0.45, H, 0.45]} color={style.wall} />),
      )}
      {style.shape === "stepped" && i > 0 && (
        <>
          <Part position={[0, 0.3, 0]} size={[w + 1.8, 0.08, d + 1.8]} color={PALETTE.stone} shadow={false} />
          {[-1, 1].map((sx) => (
            <Part key={sx} position={[(sx * (w + 1.5)) / 2, 0.35, 0]} size={[0.3, 0.42, d + 1.5]} color="#5a4634" />
          ))}
          <Model url={CITY.bush} position={[(w + 1.5) / 2, 0.75, -1.5]} scale={2} />
          <Model url={CITY.bush} position={[-(w + 1.5) / 2, 0.75, 1.5]} scale={2} />
        </>
      )}
      {style.balconies && (
        <group position={[0, 0.3, d / 2 + 0.55]}>
          <Part size={[w * 0.6, 0.14, 1.1]} color={style.wall} />
          <Part position={[0, 0.14, 0.5]} size={[w * 0.6, 0.9, 0.06]} material={glass("#cfe6ee", { opacity: 0.5 })} shadow={false} />
          <Part position={[0, 1.0, 0.5]} size={[w * 0.6, 0.06, 0.1]} color={PALETTE.metal} shadow={false} />
          <Model url={CITY.bush} position={[-w * 0.22, 0.14, 0.05]} scale={1.6} />
          <Model url={CITY.bush} position={[w * 0.22, 0.14, 0.05]} scale={1.4} />
        </group>
      )}
      {lit && <Part position={[0, 0.3, 0]} size={[w + 0.12, H - 0.5, d + 0.12]} material={glass("#ffd98a", { lit: true, opacity: 0.25 })} shadow={false} />}
      {lit && <pointLight position={[0, H / 2, d / 2 + 1.5]} color="#ffc76a" intensity={18} distance={12} decay={2} />}
    </group>
  );
}

/** импосты, рёбра и цветные полосы на всех этажах — одним инстансом на башню */
function buildDetails(style: TowerStyle) {
  const mullions: Item[] = [];
  const fins: Item[] = [];
  const bands: Item[] = [];
  for (let i = 0; i < TOWER_FLOORS; i++) {
    const y = PODIUM_H + i * H;
    const s = floorSide(style, i);
    if (style.shape === "cyl") {
      const r = s / 2 + 0.03;
      const n = 20;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        mullions.push({ p: [Math.sin(a) * r, y + 0.3 + (H - 0.3) / 2, Math.cos(a) * r], s: [0.1, H - 0.3, 0.1], r: a });
      }
      continue;
    }
    const w = style.shape === "slab" ? s * 1.3 : s;
    const d = style.shape === "slab" ? s * 0.72 : s;
    const n = 6;
    for (let k = 1; k < n; k++) {
      const ux = -w / 2 + (k / n) * w;
      const uz = -d / 2 + (k / n) * d;
      const yy = y + 0.3 + (H - 0.3) / 2;
      mullions.push({ p: [ux, yy, d / 2 + 0.03], s: [0.1, H - 0.3, 0.06] });
      mullions.push({ p: [ux, yy, -d / 2 - 0.03], s: [0.1, H - 0.3, 0.06] });
      mullions.push({ p: [w / 2 + 0.03, yy, uz], s: [0.06, H - 0.3, 0.1] });
      mullions.push({ p: [-w / 2 - 0.03, yy, uz], s: [0.06, H - 0.3, 0.1] });
      if (style.fins) {
        fins.push({ p: [ux, yy, d / 2 + 0.2], s: [0.18, H - 0.3, 0.4] });
        fins.push({ p: [ux, yy, -d / 2 - 0.2], s: [0.18, H - 0.3, 0.4] });
        fins.push({ p: [w / 2 + 0.2, yy, uz], s: [0.4, H - 0.3, 0.18] });
        fins.push({ p: [-w / 2 - 0.2, yy, uz], s: [0.4, H - 0.3, 0.18] });
      }
    }
    if (style.bands) {
      bands.push({ p: [0, y + H - 0.55, 0], s: [w + 0.16, 0.22, d + 0.16] });
      bands.push({ p: [0, y + 1.1, 0], s: [w + 0.16, 0.12, d + 0.16] });
    }
  }
  return { mullions, fins, bands };
}

function RoofTop({ style, color, y }: { style: TowerStyle; color: string; y: number }) {
  const s = floorSide(style, TOWER_FLOORS - 1);
  const w = style.shape === "slab" ? s * 1.3 : s;
  const d = style.shape === "slab" ? s * 0.72 : s;
  return (
    <group position={[0, y, 0]}>
      {style.shape === "cyl" ? (
        <Part geo="cyl" size={[s / 2 + 0.25, 0.35, s / 2 + 0.25]} color={style.wall} />
      ) : (
        <>
          <Part size={[w + 0.3, 0.35, d + 0.3]} color={style.wall} />
          <Part position={[0, 0.35, 0]} size={[w + 0.3, 0.5, 0.2]} color={style.wall} />
          <Part position={[0, 0.35, d / 2 + 0.05]} size={[w + 0.3, 0.5, 0.2]} color={style.wall} />
          <Part position={[0, 0.35, -d / 2 - 0.05]} size={[w + 0.3, 0.5, 0.2]} color={style.wall} />
          <Part position={[w / 2 + 0.05, 0.35, 0]} size={[0.2, 0.5, d + 0.3]} color={style.wall} />
          <Part position={[-w / 2 - 0.05, 0.35, 0]} size={[0.2, 0.5, d + 0.3]} color={style.wall} />
        </>
      )}
      {style.roof === "antenna" && (
        <>
          <Part position={[-1.2, 0.35, -0.8]} size={[2.2, 1, 1.4]} color={PALETTE.grey} />
          <Part position={[1.4, 0.35, 1]} size={[1, 0.6, 1]} color={PALETTE.greyDark} />
          <Part geo="cyl8" position={[1.6, 0.35, -1.4]} size={[0.07, 4.5, 0.07]} color={PALETTE.greyDark} shadow={false} />
          <Part geo="cyl8" position={[0.4, 0.35, -1.9]} size={[0.05, 3, 0.05]} color={PALETTE.greyDark} shadow={false} />
          <Part geo="sphere" position={[1.6, 4.85, -1.4]} size={[0.16, 0.16, 0.16]} color="#ff5a4a" emissive="#ff2e1a" intensity={2} shadow={false} />
        </>
      )}
      {style.roof === "mech" && (
        <>
          <Part position={[-1.5, 0.35, 0.5]} size={[2.4, 1.3, 2]} color={PALETTE.grey} />
          <Part position={[1.6, 0.35, -1]} size={[1.4, 0.8, 1.4]} color={PALETTE.greyDark} />
          <Part geo="cyl" position={[1.6, 1.15, -1]} size={[0.5, 0.25, 0.5]} color={PALETTE.dark} />
          <Part geo="cyl" position={[1.8, 0.35, 1.6]} size={[0.35, 1.8, 0.35]} color={PALETTE.metal} />
        </>
      )}
      {style.roof === "garden" && (
        <>
          <Part position={[0, 0.35, 0]} size={[w - 1, 0.25, d - 1]} color="#7fb069" shadow={false} />
          <Model url={CITY.bush} position={[-1.8, 0.6, -1.2]} scale={3} />
          <Model url={CITY.bush} position={[1.5, 0.6, 1.2]} scale={2.6} />
          <Model url={CITY.bush} position={[1.9, 0.6, -1.6]} scale={2.2} />
          <Model url={CITY.bench} position={[-1, 0.6, 1.6]} scale={3} />
          <Part position={[0, 0.6, 0]} size={[1.6, 0.06, 1.6]} color={PALETTE.stone} shadow={false} />
        </>
      )}
      {style.roof === "crown" && (
        <>
          {Array.from({ length: 12 }, (_, k) => {
            const a = (k / 12) * Math.PI * 2;
            const r = s / 2 - 0.2;
            return <Part key={k} position={[Math.sin(a) * r, 0.35, Math.cos(a) * r]} rotation={[0, a, 0]} size={[0.25, 1.6 + (k % 2) * 0.6, 0.6]} color={color} />;
          })}
          <Part geo="cyl" position={[0, 0.35, 0]} size={[1.2, 0.6, 1.2]} color={style.wall} />
          <Part geo="cyl8" position={[0, 0.95, 0]} size={[0.08, 3.2, 0.08]} color={PALETTE.greyDark} shadow={false} />
        </>
      )}
      {style.roof === "dish" && (
        <>
          <Part position={[-1.5, 0.35, -0.5]} size={[2, 0.9, 1.6]} color={PALETTE.grey} />
          <group position={[1.6, 0.35, 0.8]} rotation={[0.9, 0.6, 0]}>
            <Part geo="cyl" size={[1.3, 0.25, 1.3]} color={PALETTE.white} />
            <Part geo="cyl8" position={[0, 0.25, 0]} size={[0.05, 0.9, 0.05]} color={PALETTE.dark} shadow={false} />
          </group>
          <Part geo="cyl8" position={[1.6, 0, 0.8]} size={[0.1, 1.1, 0.1]} color={PALETTE.dark} />
        </>
      )}
      {style.roof === "helipad" && (
        <>
          <Part geo="cyl" position={[0, 0.35, 0]} size={[2.6, 0.12, 2.6]} color={PALETTE.dark} shadow={false} />
          <Part geo="cyl" position={[0, 0.47, 0]} size={[2.2, 0.02, 2.2]} color="#f2c14e" shadow={false} />
          <Part geo="cyl" position={[0, 0.49, 0]} size={[1.9, 0.02, 1.9]} color={PALETTE.dark} shadow={false} />
          <Part position={[0, 0.51, 0]} size={[0.3, 0.02, 1.6]} color="#f2c14e" shadow={false} />
          <Part position={[-0.65, 0.51, 0]} size={[0.3, 0.02, 1.6]} color="#f2c14e" shadow={false} />
          <Part position={[0.65, 0.51, 0]} size={[0.3, 0.02, 1.6]} color="#f2c14e" shadow={false} />
          <Part position={[0, 0.51, 0]} size={[1.6, 0.02, 0.3]} color="#f2c14e" shadow={false} />
          <Sign text={style.company} color={color} width={5} height={1.3} position={[0, 2.2, -d / 2 + 0.3]} />
          <Part position={[-2.2, 0.35, -d / 2 + 0.3]} size={[0.12, 1.6, 0.12]} color={PALETTE.metal} />
          <Part position={[2.2, 0.35, -d / 2 + 0.3]} size={[0.12, 1.6, 0.12]} color={PALETTE.metal} />
        </>
      )}
    </group>
  );
}

/** тонкая полоска прогресса у следующего этажа (над крышей, если этаж последний) */
function FloorProgress({ style, floor, met, total }: { style: TowerStyle; floor: number; met: number; total: number }) {
  const top = floor >= TOWER_FLOORS;
  const s = floorSide(style, Math.min(floor, TOWER_FLOORS - 1));
  const d = style.shape === "slab" ? s * 0.72 : s;
  const y = top ? PODIUM_H + TOWER_FLOORS * H + 1.2 : PODIUM_H + floor * H + H * 0.62;
  const w = Math.min(s, 6) * 0.85;
  const ratio = total > 0 ? Math.min(1, met / total) : 0;
  return (
    <group position={[0, y, d / 2 + 0.5]}>
      <Part center size={[w + 0.16, 0.5, 0.12]} color={PALETTE.dark} shadow={false} />
      {ratio > 0 && (
        <Part
          center
          position={[-w / 2 + (w * ratio) / 2, 0, 0.05]}
          size={[w * ratio, 0.34, 0.1]}
          color="#5fd39a"
          emissive="#2fbf7a"
          intensity={0.8}
          shadow={false}
        />
      )}
    </group>
  );
}
