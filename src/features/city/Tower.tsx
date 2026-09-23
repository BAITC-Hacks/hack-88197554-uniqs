"use client";

import { useClientStore } from "@/lib/client-store";
import type { Place } from "@/lib/types";
import { DEPARTMENT_COLOR, TOWER_FLOOR_HEIGHT as H, TOWER_FLOORS, gradeFloor } from "@/lib/world";
import { PALETTE, Part } from "./kit";
import { ModelOr } from "./models";

const INSET = 0.45;
const GLOW = { color: "#fff1c4", emissive: "#ffc94d", intensity: 1.4 };

function floorSide(radius: number, floor: number) {
  return radius * 1.35 - floor * INSET;
}

/** башня отдела: этаж = грейд; этаж текущего сотрудника светится */
export function Tower({ place }: { place: Place }) {
  const profile = useClientStore((s) => s.profile);
  const color = DEPARTMENT_COLOR[place.department!];
  const mine = profile?.employee.department === place.department ? profile : null;
  const myFloor = mine ? gradeFloor(mine.employee.grade) : -1;
  const base = floorSide(place.radius, 0);

  return (
    <group>
      <ModelOr kind="office">
        {Array.from({ length: TOWER_FLOORS }, (_, i) => {
          const s = floorSide(place.radius, i);
          const lit = i === myFloor;
          return (
            <group key={i} position={[0, i * H, 0]}>
              <Part size={[s, H - 0.25, s]} color={color} />
              <Part
                position={[0, 0.9, 0]}
                size={[s + 0.06, 1.2, s + 0.06]}
                color={lit ? GLOW.color : PALETTE.glass}
                emissive={lit ? GLOW.emissive : undefined}
                intensity={lit ? GLOW.intensity : undefined}
                shadow={false}
              />
              <Part position={[0, H - 0.25, 0]} size={[s + 0.3, 0.25, s + 0.3]} color={PALETTE.white} />
            </group>
          );
        })}
        {/* крыша: техблоки и антенна */}
        <Part position={[-0.8, TOWER_FLOORS * H, -0.6]} size={[1.6, 0.8, 1.2]} color={PALETTE.grey} />
        <Part position={[1.1, TOWER_FLOORS * H, 0.7]} size={[0.9, 0.5, 0.9]} color={PALETTE.greyDark} />
        <Part position={[1.2, TOWER_FLOORS * H, -1]} size={[0.06, 2.2, 0.06]} geo="cyl8" color={PALETTE.greyDark} shadow={false} />
        {/* вход */}
        <Part position={[0, 0, base / 2]} size={[2, 2.3, 0.3]} color={PALETTE.white} />
        <Part position={[0, 0, base / 2 + 0.05]} size={[1.4, 1.9, 0.3]} color={PALETTE.dark} />
      </ModelOr>
      {mine?.target && <FloorProgress radius={place.radius} floor={myFloor + 1} met={mine.gradeProgress.met} total={mine.gradeProgress.total} />}
    </group>
  );
}

/** тонкая полоска прогресса у следующего этажа (над крышей, если этаж последний) */
function FloorProgress({ radius, floor, met, total }: { radius: number; floor: number; met: number; total: number }) {
  const top = floor >= TOWER_FLOORS;
  const s = floorSide(radius, Math.min(floor, TOWER_FLOORS - 1));
  const y = top ? TOWER_FLOORS * H + 1.2 : floor * H + H * 0.62;
  const w = s * 0.85;
  const ratio = total > 0 ? Math.min(1, met / total) : 0;
  return (
    <group position={[0, y, s / 2 + 0.5]}>
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
