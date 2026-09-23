"use client";

// Экран выбора героя в лобби: четыре класса KayKit на площадке, выбранный выходит вперёд.

import { ContactShadows } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { Group, Material, Mesh, MeshStandardMaterial, PointLight } from "three";
import { Character, type CharacterAction } from "@/features/city/Character";
import { GRADE_CHARACTER } from "@/features/city/avatar";
import type { CharacterId } from "@/features/city/models";
import type { Grade } from "@/lib/types";

const NAMES: Record<CharacterId, string> = {
  rogue: "Разведчик",
  knight: "Рыцарь",
  mage: "Маг",
  barbarian: "Варвар",
};

/** классы в порядке грейдов, как в GRADE_CHARACTER */
export const HEROES = (Object.keys(GRADE_CHARACTER) as Grade[]).map((grade) => ({
  id: GRADE_CHARACTER[grade],
  grade,
  name: NAMES[GRADE_CHARACTER[grade]],
}));

const GAP = 1.45;
const X = HEROES.map((_, i) => (i - (HEROES.length - 1) / 2) * GAP);
const FORWARD = 0.7;
const CHEER_MS = 1800;

interface HeroProps {
  id: CharacterId;
  x: number;
  index: number;
  selected: boolean;
  onSelect: (id: CharacterId) => void;
}

function Hero({ id, x, index, selected, onSelect }: HeroProps) {
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const action = useRef<CharacterAction>("idle");
  const cheerUntil = useRef(0);
  const mats = useRef<Material[] | null>(null);
  const light = useRef(selected ? 1 : 0.42);
  const wasSelected = useRef<boolean | null>(null);
  const [hovered, setHovered] = useState(false);

  // Выбор: один раз cheer, потом снова idle. При первом показе без жеста.
  useEffect(() => {
    if (wasSelected.current !== null && selected && !wasSelected.current) {
      action.current = "cheer";
      cheerUntil.current = performance.now() + CHEER_MS;
    }
    if (!selected) {
      action.current = "idle";
      cheerUntil.current = 0;
    }
    wasSelected.current = selected;
  }, [selected]);

  useEffect(() => () => {
    document.body.style.cursor = "";
  }, []);

  useFrame((_, rawDelta) => {
    const g = root.current;
    const b = body.current;
    if (!g || !b) return;
    const dt = Math.min(rawDelta, 0.05);
    const k = 1 - Math.exp(-dt * 8);

    if (cheerUntil.current && performance.now() > cheerUntil.current) {
      cheerUntil.current = 0;
      action.current = "idle";
    }

    g.position.z += ((selected ? FORWARD : 0) - g.position.z) * k;

    // Свои копии материалов, чтобы приглушать героя, не трогая персонажей в городе.
    if (!mats.current) {
      const list: Material[] = [];
      b.traverse((o) => {
        const m = o as Mesh;
        if (!m.isMesh) return;
        m.material = Array.isArray(m.material) ? m.material.map((x) => x.clone()) : m.material.clone();
        list.push(...(Array.isArray(m.material) ? m.material : [m.material]));
      });
      if (list.length) mats.current = list;
    }
    const target = selected ? 1 : hovered ? 0.75 : 0.42;
    light.current += (target - light.current) * k;
    for (const m of mats.current ?? []) (m as MeshStandardMaterial).color?.setScalar(light.current);
  });

  return (
    <group ref={root} position={[x, 0, 0]}>
      <group ref={body}>
        <Character model={id} actionRef={action} phase={index * 0.37} />
      </group>
      <mesh
        position={[0, 0.95, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "";
        }}
      >
        <cylinderGeometry args={[0.55, 0.55, 1.9, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** кольцо и свет под выбранным героем */
function Spotlight({ index }: { index: number }) {
  const ring = useRef<Group>(null);
  const lamp = useRef<PointLight>(null);
  useFrame(({ clock }, rawDelta) => {
    const r = ring.current;
    if (!r) return;
    const k = 1 - Math.exp(-Math.min(rawDelta, 0.05) * 8);
    r.position.x += (X[index] - r.position.x) * k;
    r.position.z += (FORWARD - r.position.z) * k;
    const s = 1 + Math.sin(clock.elapsedTime * 3) * 0.04;
    r.scale.set(s, s, s);
    lamp.current?.position.set(r.position.x, 2.6, r.position.z + 1.2);
  });
  return (
    <>
      <group ref={ring} position={[X[index], 0, FORWARD]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.52, 0.64, 48]} />
          <meshBasicMaterial color="#34d399" toneMapped={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
          <circleGeometry args={[0.64, 48]} />
          <meshBasicMaterial color="#34d399" transparent opacity={0.18} depthWrite={false} />
        </mesh>
      </group>
      <pointLight ref={lamp} position={[X[index], 2.6, FORWARD + 1.2]} intensity={9} distance={6} decay={1.6} color="#fff4dc" />
    </>
  );
}

export function CharacterSelect({ selected, onSelect }: { selected: CharacterId; onSelect: (id: CharacterId) => void }) {
  const index = Math.max(0, HEROES.findIndex((h) => h.id === selected));
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 2.2, 7.6], fov: 30 }}
      onCreated={({ camera }) => camera.lookAt(0, 0.95, 0.3)}
    >
      <hemisphereLight args={["#e0f2fe", "#1e293b", 1.2]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 6, 5]} intensity={1.5} />
      <mesh position={[0, -0.15, 0.2]}>
        <cylinderGeometry args={[3.9, 4.1, 0.3, 64]} />
        <meshStandardMaterial color="#334155" roughness={0.9} />
      </mesh>
      <ContactShadows position={[0, 0.005, 0.2]} opacity={0.55} scale={9} blur={2.4} far={3} />
      <Spotlight index={index} />
      {HEROES.map((h, i) => (
        <Hero key={h.id} id={h.id} x={X[i]} index={i} selected={h.id === selected} onSelect={onSelect} />
      ))}
    </Canvas>
  );
}
