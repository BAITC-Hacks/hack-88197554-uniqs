// Пасхалки и живые объекты сцены добавляются одной строкой.
// Каждый компонент рендерится внутри <Canvas>; позицию персонажа брать из ./playerState.

import type { ComponentType } from "react";
import { WhyHere } from "@/features/career/WhyHere";
import { MentorGuide } from "@/features/hud/MentorGuide";

export const EXTRAS: ComponentType[] = [MentorGuide, WhyHere];
