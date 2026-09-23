"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { PerspectiveCamera, Vector3 } from "three";
import { playerPosition } from "./playerState";
import { getScene } from "./sceneState";
import { cameraInputBlocked, cameraLook, getCameraMode, useCameraMode } from "./cameraState";

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
  const mode = useCameraMode();
  const zoom = useRef({ value: 1, target: 1, ready: false, mode: "street" as string });

  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (getCameraMode() === "first-person" || cameraInputBlocked()) return;
      const z = zoom.current;
      const inside = getScene().mode === "interior";
      z.target = Math.min(inside ? 1.3 : ZOOM_MAX, Math.max(inside ? 0.38 : ZOOM_MIN, z.target * Math.exp(e.deltaY * 0.001)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [gl]);

  useEffect(() => {
    if (mode !== "first-person") return;
    const canvas = gl.domElement;
    // Capture before R3F handles the event: looking around must not start click-to-walk.
    const surface = canvas.parentElement ?? canvas;
    let drag: { id: number; x: number; y: number } | null = null;
    const stop = () => {
      if (drag && canvas.hasPointerCapture(drag.id)) canvas.releasePointerCapture(drag.id);
      drag = null;
      canvas.style.setProperty("cursor", "grab");
    };
    const down = (event: PointerEvent) => {
      if (event.target !== canvas || cameraInputBlocked() || (event.button !== 0 && event.button !== 2)) return;
      event.preventDefault();
      event.stopPropagation();
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
      canvas.style.setProperty("cursor", "grabbing");
    };
    const move = (event: PointerEvent) => {
      if (!drag || drag.id !== event.pointerId) return;
      event.stopPropagation();
      if (cameraInputBlocked()) return stop();
      cameraLook.yaw -= (event.clientX - drag.x) * 0.004;
      cameraLook.pitch = Math.max(-1.2, Math.min(1.2, cameraLook.pitch - (event.clientY - drag.y) * 0.004));
      drag.x = event.clientX;
      drag.y = event.clientY;
    };
    const up = (event: PointerEvent) => {
      if (!drag || drag.id !== event.pointerId) return;
      event.stopPropagation();
      stop();
    };
    const suppress = (event: Event) => {
      if (event.target !== canvas) return;
      event.preventDefault();
      event.stopPropagation();
    };
    const previousCursor = canvas.style.cursor;
    canvas.style.setProperty("cursor", "grab");
    surface.addEventListener("pointerdown", down, true);
    surface.addEventListener("pointermove", move, true);
    surface.addEventListener("pointerup", up, true);
    surface.addEventListener("pointercancel", up, true);
    surface.addEventListener("click", suppress, true);
    surface.addEventListener("dblclick", suppress, true);
    surface.addEventListener("contextmenu", suppress, true);
    canvas.addEventListener("lostpointercapture", stop);
    window.addEventListener("blur", stop);
    return () => {
      stop();
      canvas.style.setProperty("cursor", previousCursor);
      surface.removeEventListener("pointerdown", down, true);
      surface.removeEventListener("pointermove", move, true);
      surface.removeEventListener("pointerup", up, true);
      surface.removeEventListener("pointercancel", up, true);
      surface.removeEventListener("click", suppress, true);
      surface.removeEventListener("dblclick", suppress, true);
      surface.removeEventListener("contextmenu", suppress, true);
      canvas.removeEventListener("lostpointercapture", stop);
      window.removeEventListener("blur", stop);
    };
  }, [gl, mode]);

  useFrame(({ camera }, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const z = zoom.current;
    const scene = getScene();
    const firstPerson = getCameraMode() === "first-person" && !scene.controlsLocked;
    if (camera instanceof PerspectiveCamera) {
      const fov = firstPerson ? 68 : 45;
      const near = firstPerson ? 0.08 : 0.5;
      if (camera.fov !== fov || camera.near !== near) {
        camera.fov = fov;
        camera.near = near;
        camera.updateProjectionMatrix();
        z.ready = false;
      }
    }
    if (firstPerson) {
      const eyeHeight = scene.seated ? 1.05 : 1.6;
      camera.position.set(playerPosition.x, playerPosition.y + eyeHeight, playerPosition.z);
      camera.rotation.set(cameraLook.pitch, cameraLook.yaw + Math.PI, 0, "YXZ");
      z.ready = false;
      return;
    }
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
