"use client";

import { useSyncExternalStore } from "react";
import { actions, getState } from "@/lib/client-store";
import { playerYaw } from "./playerState";
import { getScene } from "./sceneState";

export type CameraMode = "overview" | "first-person";
let mode: CameraMode = "overview";
const listeners = new Set<() => void>();

// Angles change while dragging, without rerendering the scene every frame.
export const cameraLook = { yaw: 0, pitch: 0 };
export const getCameraMode = () => mode;

export function resetCameraLook(yaw: number) {
  cameraLook.yaw = yaw;
  cameraLook.pitch = 0;
}

export function cameraInputBlocked() {
  const scene = getScene();
  return scene.controlsLocked || scene.fade || scene.elevator || !!getState().openPanel;
}

export function setCameraMode(next: CameraMode) {
  if (mode === next) return;
  mode = next;
  resetCameraLook(playerYaw.value);
  actions.clearMoveTarget();
  listeners.forEach((listener) => listener());
}

export function toggleCameraMode() {
  setCameraMode(mode === "overview" ? "first-person" : "overview");
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useCameraMode() {
  return useSyncExternalStore(subscribe, getCameraMode, () => "overview" as CameraMode);
}
