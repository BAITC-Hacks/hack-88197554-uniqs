"use client";

// Анимированный персонаж KayKit (CC0): idle / walk / run / sit / cheer / interact с кроссфейдом.
// Действие можно задать пропом или через ref (Player меняет его каждый кадр без ререндера).

import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { LoopOnce, LoopRepeat, type AnimationAction, type Group } from "three";
import { CHARACTERS, prepareClone, type CharacterId } from "./models";

export type CharacterAction = "idle" | "walk" | "run" | "sit" | "sitfloor" | "cheer" | "interact" | "sitdown";

const CLIP: Record<CharacterAction, string> = {
  idle: "Idle",
  walk: "Walking_A",
  run: "Running_A",
  sit: "Sit_Chair_Idle",
  sitfloor: "Sit_Floor_Idle",
  sitdown: "Sit_Chair_Down",
  cheer: "Cheer",
  interact: "Interact",
};
const ONCE: Partial<Record<CharacterAction, true>> = { cheer: true, interact: true, sitdown: true };

const PROPS = /Sword|Shield|Axe|Mug|Wand|Staff|Spellbook|Crossbow|Knife|Throwable/;

/** высота модели KayKit ≈ 2.2, персонаж в мире ≈ 1.75 м */
export const CHARACTER_SCALE = 0.8;

interface Props {
  model: CharacterId;
  action?: CharacterAction;
  actionRef?: { current: CharacterAction };
  /** сдвиг фазы, чтобы NPC не шагали синхронно */
  phase?: number;
  scale?: number;
}

interface Playing {
  name: CharacterAction | null;
  action: AnimationAction | null;
}

type Actions = Record<string, AnimationAction | null>;

/** переключить клип с кроссфейдом; вне компонента, чтобы не мутировать значения рендера */
function switchTo(state: Playing, actions: Actions, name: CharacterAction, phase: number) {
  if (state.name === name) return;
  const next = actions[CLIP[name]];
  if (!next) return;
  next.reset();
  next.setLoop(ONCE[name] ? LoopOnce : LoopRepeat, Infinity);
  next.clampWhenFinished = !!ONCE[name];
  next.enabled = true;
  if (state.action && state.action !== next) next.crossFadeFrom(state.action, 0.22, true);
  next.play();
  if (state.name === null && phase) next.time = phase;
  state.name = name;
  state.action = next;
}

function CharacterInner({ model, action = "idle", actionRef, phase = 0, scale = CHARACTER_SCALE }: Props) {
  const url = CHARACTERS[model];
  const { scene, animations } = useGLTF(url);
  const object = useMemo(() => {
    const o = prepareClone(scene);
    // оружие и реквизит из пака приключенцев в офисе ни к чему
    o.traverse((n) => {
      if (PROPS.test(n.name)) n.visible = false;
    });
    return o;
  }, [scene]);
  const group = useRef<Group>(null);
  const { actions } = useAnimations(animations, group);
  const playing = useRef<Playing>({ name: null, action: null });

  useEffect(() => {
    if (!actionRef) switchTo(playing.current, actions, action, phase);
  }, [action, actions, actionRef, phase]);

  useFrame(() => {
    if (actionRef) switchTo(playing.current, actions, actionRef.current, phase);
  });

  return (
    <group ref={group} scale={scale}>
      <primitive object={object} />
    </group>
  );
}

export function Character(props: Props) {
  return (
    <Suspense fallback={null}>
      <CharacterInner {...props} />
    </Suspense>
  );
}
