// Пасхалки и живые объекты сцены добавляются одной строкой.
// Каждый компонент рендерится внутри <Canvas>; позицию персонажа брать из ./playerState.

import type { ComponentType } from "react";
import { MentorGuide } from "@/features/hud/MentorGuide";

export const EXTRAS: ComponentType[] = [MentorGuide];
