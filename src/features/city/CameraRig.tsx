"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Vector3 } from "three";
import { playerPosition } from "./playerState";

const OFFSET = new Vector3(0, 18, 14);
const ZOOM_MIN = 0.6;
const ZOOM_MAX = 2.2;
/** дальше этого камера не догоняет, а прыгает (телепорт) */
const SNAP_DISTANCE = 25;

const desired = new Vector3();
const lookAt = new Vector3();

/** камера сверху под углом ~52°, мягко следует за персонажем; колесо — зум */
export function CameraRig() {
  const gl = useThree((s) => s.gl);
  const zoom = useRef({ value: 1, target: 1, ready: false });

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
    z.value += (z.target - z.value) * (1 - Math.exp(-dt * 8));
    desired.copy(OFFSET).multiplyScalar(z.value).add(playerPosition);
    if (!z.ready || camera.position.distanceTo(desired) > SNAP_DISTANCE) {
      camera.position.copy(desired);
      z.ready = true;
    } else {
      camera.position.lerp(desired, 1 - Math.exp(-dt * 5));
    }
    lookAt.set(playerPosition.x, playerPosition.y + 1, playerPosition.z);
    camera.lookAt(lookAt);
  });

  return null;
}
