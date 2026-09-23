"use client";

// Подсказка «E · действие» над объектом, с которым можно взаимодействовать.

import { Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useScene } from "./sceneState";

export function Hint3D() {
  const hint = useScene((s) => s.hint);
  const seated = useScene((s) => s.seated);
  const connected = useThree((s) => s.events.connected);
  if (!hint || !connected || seated) return null;
  return (
    <Html position={[hint.position[0], hint.position[1] + 2.1, hint.position[2]]} center zIndexRange={[7, 0]} pointerEvents="none">
      <div className="pointer-events-none flex items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-900/90 px-3 py-1 text-xs font-medium text-white shadow-md">
        <kbd className="rounded bg-white/20 px-1.5 font-mono">E</kbd>
        {hint.label}
      </div>
    </Html>
  );
}
