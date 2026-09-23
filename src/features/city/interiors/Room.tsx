"use client";

// Общие детали интерьеров: комната без потолка (камера сверху), выход, интерактивные объекты, сидения.

import { Html } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { MeshStandardMaterial, type Mesh } from "three";
import { actions } from "@/lib/client-store";
import { GEO, PALETTE, Part, mat, noiseTexture } from "../kit";
import { playerPosition } from "../playerState";
import { interactables, sceneActions, setWalkBounds, useScene, walkBounds, type Seat } from "../sceneState";

export const WALL_H = 3.2;
/** ближняя к камере стена — низкий парапет, чтобы видеть комнату */
const FRONT_WALL_H = 0.7;

function onFloorDown(e: ThreeEvent<PointerEvent>) {
  if (e.button !== 0) return;
  e.stopPropagation();
  actions.walkTo([e.point.x, e.point.z]);
}

interface RoomProps {
  /** размеры по x и z; центр комнаты в начале координат */
  w: number;
  d: number;
  floor?: string;
  wall?: string;
  trim?: string;
  /** выход на +z стене; false — без двери (этажи башни выходят через лифт) */
  exit?: boolean;
  /** куда встаёт персонаж при входе: по умолчанию у двери, лицом внутрь */
  spawn?: [number, number];
  spawnYaw?: number;
  children?: ReactNode;
}

const floorCache = new Map<string, MeshStandardMaterial>();
function floorMat(color: string) {
  let m = floorCache.get(color);
  if (!m) {
    m = new MeshStandardMaterial({ color, roughness: 0.9, map: noiseTexture() });
    floorCache.set(color, m);
  }
  return m;
}

export function Room({ w, d, floor = "#d9d2c4", wall = "#f2ede4", trim = "#c9c2b4", exit = true, spawn, spawnYaw = Math.PI, children }: RoomProps) {
  const hw = w / 2;
  const hd = d / 2;
  const sx = spawn?.[0] ?? 0;
  const sz = spawn?.[1] ?? hd - 1.6;
  useEffect(() => {
    setWalkBounds({ minX: -hw + 0.6, maxX: hw - 0.6, minZ: -hd + 0.6, maxZ: hd - 0.6, blockers: [] });
    sceneActions.setSpawn([sx, sz], spawnYaw);
  }, [hw, hd, sx, sz, spawnYaw]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} material={floorMat(floor)} receiveShadow onPointerDown={onFloorDown}>
        <planeGeometry args={[w, d]} />
      </mesh>
      {/* внешняя площадка вокруг, чтобы за стенами не было пустоты */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} material={mat("#b9b3a6")} receiveShadow>
        <planeGeometry args={[w + 30, d + 30]} />
      </mesh>
      <Part position={[0, 0, -hd]} size={[w + 0.4, WALL_H, 0.4]} color={wall} flat={false} />
      <Part position={[-hw, 0, 0]} size={[0.4, WALL_H, d]} color={wall} flat={false} />
      <Part position={[hw, 0, 0]} size={[0.4, WALL_H, d]} color={wall} flat={false} />
      <Part position={[0, 0, hd]} size={[w + 0.4, FRONT_WALL_H, 0.4]} color={wall} flat={false} />
      {/* плинтус */}
      <Part position={[0, 0, -hd + 0.25]} size={[w, 0.12, 0.1]} color={trim} shadow={false} />
      <Part position={[-hw + 0.25, 0, 0]} size={[0.1, 0.12, d]} color={trim} shadow={false} />
      <Part position={[hw - 0.25, 0, 0]} size={[0.1, 0.12, d]} color={trim} shadow={false} />
      {exit && <ExitDoor z={hd} />}
      {children}
    </group>
  );
}

/** выход на улицу: проём в низком парапете, коврик и светящаяся табличка, ничего не заслоняет камеру */
function ExitDoor({ z }: { z: number }) {
  return (
    <group position={[0, 0, z]}>
      <Part position={[0, 0, -0.35]} size={[2.6, 0.05, 1.2]} color="#5a6270" shadow={false} />
      <Part position={[-1.5, 0, 0]} size={[0.3, 1.1, 0.5]} color={PALETTE.dark} />
      <Part position={[1.5, 0, 0]} size={[0.3, 1.1, 0.5]} color={PALETTE.dark} />
      <Part position={[0, 1.1, 0]} size={[3.3, 0.12, 0.5]} color={PALETTE.dark} shadow={false} />
      <Part position={[0, 1.22, 0]} size={[1.5, 0.32, 0.3]} color="#3fae5a" emissive="#2ecc71" intensity={0.9} shadow={false} />
      <Interactable id="exit" label="Выйти на улицу" position={[0, 0, -0.9]} radius={2} onInteract={() => sceneActions.exit()} />
    </group>
  );
}

interface InteractableProps {
  id: string;
  label: string;
  /** позиция в мировых координатах (комнаты стоят в начале координат) */
  position: [number, number, number];
  radius?: number;
  onInteract: () => void;
  /** подсветка кольцом на полу, когда рядом */
  ring?: boolean;
}

/** объект, у которого работает E; подсказка появляется в радиусе */
export function Interactable({ id, label, position, radius = 1.8, onInteract, ring = true }: InteractableProps) {
  const ref = useRef<Mesh>(null);
  const bubble = useScene((s) => s.bubbles[id]);
  const connected = useThree((s) => s.events.connected);
  useEffect(() => {
    interactables.set(id, { id, label, position, radius, onInteract });
    return () => {
      interactables.delete(id);
    };
  }, [id, label, position, radius, onInteract]);
  useFrame((state) => {
    const m = ref.current;
    if (!m) return;
    const d = Math.hypot(playerPosition.x - position[0], playerPosition.z - position[2]);
    m.visible = d <= radius;
    if (m.visible) {
      const k = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.06;
      m.scale.set(k, k, 1);
    }
  });
  return (
    <group>
      {ring && (
        <mesh ref={ref} geometry={GEO.ring} material={mat("#ffd166", { emissive: "#ffb703", intensity: 0.8 })} rotation={[-Math.PI / 2, 0, 0]} position={[position[0], 0.03, position[2]]} scale={[1.6, 1.6, 1]} visible={false} />
      )}
      {bubble && connected && (
        <Html position={[position[0], position[1] + 1.9, position[2]]} center zIndexRange={[6, 0]} pointerEvents="none">
          <div className="pointer-events-none w-60 rounded-2xl bg-white px-3 py-2 text-center text-xs text-slate-800 shadow-md ring-1 ring-black/10">{bubble.text}</div>
        </Html>
      )}
    </group>
  );
}

/** круг, в который персонаж не заходит (стол, стойка, растение) */
export function Blocker({ x, z, r }: { x: number; z: number; r: number }) {
  useEffect(() => {
    const b = { x, z, r };
    walkBounds.blockers.push(b);
    return () => {
      const i = walkBounds.blockers.indexOf(b);
      if (i >= 0) walkBounds.blockers.splice(i, 1);
    };
  }, [x, z, r]);
  return null;
}

/** место, куда можно сесть: E → персонаж садится лицом по yaw */
export function SeatSpot({ id, position, yaw, label = "Сесть" }: { id: string; position: [number, number, number]; yaw: number; label?: string }) {
  const seat = useMemo<Seat>(() => ({ id, position, yaw }), [id, position, yaw]);
  const hint = useMemo<[number, number, number]>(() => [position[0] + Math.sin(yaw) * 0.6, 0, position[2] + Math.cos(yaw) * 0.6], [position, yaw]);
  return <Interactable id={id} label={label} position={hint} radius={1.5} onInteract={() => sceneActions.sit(seat)} />;
}
