// Позиция и поворот персонажа для камеры, подписей и пасхалок. Не в сторе: меняется каждый кадр.
// Пишет только Player; остальные читают в useFrame.

import { Vector3 } from "three";

export const playerPosition = new Vector3(0, 0, 8);
export const playerYaw = { value: 0 };
