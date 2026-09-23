"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Vector3 } from "three";
import { playerPosition } from "./playerState";
import { getScene } from "./sceneState";

/** базовый отступ камеры при zoom = 1: сверху под углом ~52°, как в Brawl Stars */
const OFFSET = new Vector3(0, 18, 14);
const ZOOM_MIN = 0.28;
const ZOOM_MAX = 2.2;
/** дальше этого камера не догоняет, а прыгает (телепорт) */
const SNAP_DISTANCE = 25;
/** Внутри видим персонажа и ближайшие занятия, а не весь план здания. */
const ROOM_ZOOM = 0.68;

const desired = new Vector3();
const lookAt = new Vector3();

/** камера сверху под углом, мягко следует за персонажем; колесо — зум, ближе — угол ниже */
export function CameraRig() {
  const gl = useThree((s) => s.gl);
  const zoom = useRef({ value: 1, target: 1, ready: false, mode: "street" as string });

  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const z = zoom.current;
      const inside = getScene().mode === "interior";
      z.target = Math.min(inside ? 1.3 : ZOOM_MAX, Math.max(inside ? 0.38 : ZOOM_MIN, z.target * Math.exp(e.deltaY * 0.001)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [gl]);

  useFrame(({ camera }, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const z = zoom.current;
    const scene = getScene();
    const inside = scene.mode === "interior";
    const view = inside ? `${scene.interior?.placeId}:${scene.interior?.floor}` : "street";
    if (view !== z.mode) {
      z.mode = view;
      z.target = inside ? ROOM_ZOOM : 1;
      z.value = z.target;
      z.ready = false;
    }
    z.value += (z.target - z.value) * (1 - Math.exp(-dt * 8));
    // при приближении камера опускается: y растёт быстрее, чем z
    const k = z.value;
    desired.set(0, OFFSET.y * Math.pow(k, 1.25), OFFSET.z * Math.pow(k, 0.85));
    desired.add(playerPosition);
    if (inside) desired.z -= 2;
    if (!z.ready || camera.position.distanceTo(desired) > SNAP_DISTANCE) {
      camera.position.copy(desired);
      z.ready = true;
    } else {
      camera.position.lerp(desired, 1 - Math.exp(-dt * 6));
    }
    lookAt.set(playerPosition.x, playerPosition.y + 1.1, playerPosition.z - (inside ? 2 : 0));
    camera.lookAt(lookAt);
  });

  return null;
}
