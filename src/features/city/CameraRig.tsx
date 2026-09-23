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
/** в интерьере камера ближе и чуть ниже */
const INTERIOR_ZOOM = 0.62;

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
      z.target = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z.target * Math.exp(e.deltaY * 0.001)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [gl]);

  useFrame(({ camera }, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const z = zoom.current;
    const mode = getScene().mode;
    if (mode !== z.mode) {
      z.mode = mode;
      z.target = mode === "interior" ? INTERIOR_ZOOM : 1;
    }
    z.value += (z.target - z.value) * (1 - Math.exp(-dt * 8));
    // при приближении камера опускается: y растёт быстрее, чем z
    const k = z.value;
    desired.set(0, OFFSET.y * Math.pow(k, 1.25), OFFSET.z * Math.pow(k, 0.85)).add(playerPosition);
    if (!z.ready || camera.position.distanceTo(desired) > SNAP_DISTANCE) {
      camera.position.copy(desired);
      z.ready = true;
    } else {
      camera.position.lerp(desired, 1 - Math.exp(-dt * 6));
    }
    lookAt.set(playerPosition.x, playerPosition.y + 1.1, playerPosition.z);
    camera.lookAt(lookAt);
  });

  return null;
}
