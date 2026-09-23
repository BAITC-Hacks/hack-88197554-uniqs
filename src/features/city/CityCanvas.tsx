"use client";

// Корень 3D-города. Импортируется из src/app/page.tsx через dynamic(..., { ssr: false }).
// Ничего не грузит: сотрудников и профиль подтягивает HUD, сцена читает client-store.

import { Canvas } from "@react-three/fiber";
import { useEffect } from "react";
import { CameraRig } from "./CameraRig";
import { Decor } from "./Decor";
import { EXTRAS } from "./extras";
import { Ground } from "./Ground";
import { preloadStreet } from "./models";
import { Places } from "./Places";
import { Player } from "./Player";

const SKY = "#cfe6ee";
/** тень покрывает всю землю: свет смотрит в начало координат. PCFSoft в three 0.186 удалён, поэтому "percentage" */
const SHADOW_EXTENT = 90;

export default function CityCanvas() {
  useEffect(() => preloadStreet(), []);
  return (
    <Canvas shadows="percentage" dpr={[1, 2]} camera={{ fov: 45, near: 0.5, far: 400, position: [0, 26, 30] }}>
      <color attach="background" args={[SKY]} />
      <fog attach="fog" args={[SKY, 55, 150]} />
      <hemisphereLight args={["#fff7e8", "#86a86a", 1.1]} />
      <directionalLight
        position={[35, 60, 25]}
        intensity={2.4}
        color="#fff1d8"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-camera-left={-SHADOW_EXTENT}
        shadow-camera-right={SHADOW_EXTENT}
        shadow-camera-top={SHADOW_EXTENT}
        shadow-camera-bottom={-SHADOW_EXTENT}
        shadow-camera-near={1}
        shadow-camera-far={220}
      />
      <Ground />
      <Decor />
      <Places />
      <Player />
      <CameraRig />
      {EXTRAS.map((Extra, i) => (
        <Extra key={i} />
      ))}
    </Canvas>
  );
}
