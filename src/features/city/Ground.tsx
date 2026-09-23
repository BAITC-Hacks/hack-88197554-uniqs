"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { actions } from "@/lib/client-store";
import { GEO, PALETTE, mat } from "./kit";
import { GROUND_CENTER, GROUND_SIZE, PLAZA, ROADS } from "./layout";

// Слои над травой: мелкий подъём по y + polygonOffset, чтобы не мерцало.
const roadMat = mat(PALETTE.road).clone();
roadMat.polygonOffset = true;
roadMat.polygonOffsetFactor = -1;
roadMat.polygonOffsetUnits = -1;
const plazaMat = mat(PALETTE.plaza).clone();
plazaMat.polygonOffset = true;
plazaMat.polygonOffsetFactor = -2;
plazaMat.polygonOffsetUnits = -2;
const plazaInnerMat = mat(PALETTE.plazaInner).clone();
plazaInnerMat.polygonOffset = true;
plazaInnerMat.polygonOffsetFactor = -3;
plazaInnerMat.polygonOffsetUnits = -3;

const FLAT: [number, number, number] = [-Math.PI / 2, 0, 0];

function onGroundDown(e: ThreeEvent<PointerEvent>) {
  if (e.button !== 0) return;
  e.stopPropagation();
  actions.walkTo([e.point.x, e.point.z]);
}

export function Ground() {
  return (
    <group>
      {/* дальняя трава за краем города, чтобы не было пустоты */}
      <mesh rotation={FLAT} position={[GROUND_CENTER[0], -0.05, GROUND_CENTER[1]]} material={mat(PALETTE.grassFar)} receiveShadow>
        <planeGeometry args={[500, 500]} />
      </mesh>
      <mesh
        rotation={FLAT}
        position={[GROUND_CENTER[0], 0, GROUND_CENTER[1]]}
        material={mat(PALETTE.grass)}
        receiveShadow
        onPointerDown={onGroundDown}
      >
        <planeGeometry args={GROUND_SIZE} />
      </mesh>

      {ROADS.map((r, i) => (
        <mesh
          key={i}
          geometry={GEO.box}
          material={roadMat}
          position={[r.x, 0.01, r.z]}
          scale={[r.w, 0.02, r.d]}
          receiveShadow
          raycast={noRaycast}
        />
      ))}

      <mesh rotation={FLAT} position={[PLAZA.x, 0.03, PLAZA.z]} material={plazaMat} receiveShadow raycast={noRaycast}>
        <circleGeometry args={[PLAZA.radius, 40]} />
      </mesh>
      <mesh rotation={FLAT} position={[PLAZA.x, 0.04, PLAZA.z]} material={plazaInnerMat} receiveShadow raycast={noRaycast}>
        <ringGeometry args={[PLAZA.radius - 1.6, PLAZA.radius - 1, 40]} />
      </mesh>
    </group>
  );
}

/** дороги и площадь прозрачны для клика: попадание уходит в траву под ними */
function noRaycast() {}
