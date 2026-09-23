"use client";

// Корень 3D-города. Импортируется из src/app/page.tsx через dynamic(..., { ssr: false }).
// Ничего не грузит: сотрудников и профиль подтягивает HUD, сцена читает client-store.

import { Sky } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import { PMREMGenerator, type Scene, type WebGLRenderer } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { CameraRig } from "./CameraRig";
import { EXTRAS } from "./extras";
import { Hint3D } from "./Hint3D";
import { Interior } from "./interiors/Interior";
import { InteriorControls } from "./interiors/InteriorControls";
import { preloadInteriors, preloadStreet } from "./models";
import { Player } from "./Player";
import { DeltaPopup } from "./QuestMarkers";
import { useScene } from "./sceneState";
import { Street } from "./Street";

const SKY = "#cfe3ee";
const SUN: [number, number, number] = [35, 60, 25];
/** тень покрывает всю землю: свет смотрит в начало координат. PCFSoft в three 0.186 удалён, поэтому "percentage" */
const SHADOW_EXTENT = 90;

/** отражения для стекла и металла без сетевых HDR: RoomEnvironment через PMREM */
function Environment() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => applyEnvironment(gl, scene), [gl, scene]);
  return null;
}

function applyEnvironment(gl: WebGLRenderer, scene: Scene) {
  const pmrem = new PMREMGenerator(gl);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.5;
  return () => {
    scene.environment = null;
    env.dispose();
    pmrem.dispose();
  };
}

function World() {
  const mode = useScene((s) => s.mode);
  return (
    <>
      {mode === "street" ? <Street /> : <Interior />}
      <Player />
      <DeltaPopup />
      <CameraRig />
      <Hint3D />
    </>
  );
}

export default function CityCanvas() {
  const fade = useScene((s) => s.fade);
  const mode = useScene((s) => s.mode);
  useEffect(() => {
    preloadStreet();
    const t = setTimeout(preloadInteriors, 4000);
    return () => clearTimeout(t);
  }, []);
  return (
    <>
      <Canvas shadows="percentage" dpr={[1, 2]} camera={{ fov: 45, near: 0.5, far: 400, position: [0, 26, 30] }}>
        <color attach="background" args={[SKY]} />
        <fog attach="fog" args={[SKY, mode === "street" ? 60 : 200, mode === "street" ? 170 : 400]} />
        {mode === "street" && <Sky sunPosition={SUN} turbidity={4} rayleigh={1.2} mieCoefficient={0.004} mieDirectionalG={0.85} distance={2000} />}
        <Environment />
        <hemisphereLight args={["#fff7e8", "#7f9a66", 0.9]} />
        <ambientLight intensity={0.15} />
        <directionalLight
          position={SUN}
          intensity={mode === "street" ? 2.6 : 1.6}
          color="#fff1d8"
          castShadow
          shadow-mapSize={[4096, 4096]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.05}
          shadow-camera-left={-SHADOW_EXTENT}
          shadow-camera-right={SHADOW_EXTENT}
          shadow-camera-top={SHADOW_EXTENT}
          shadow-camera-bottom={-SHADOW_EXTENT}
          shadow-camera-near={1}
          shadow-camera-far={220}
        />
        <Suspense fallback={null}>
          <World />
        </Suspense>
        {EXTRAS.map((Extra, i) => (
          <Extra key={i} />
        ))}
      </Canvas>
      <div
        className="pointer-events-none absolute inset-0 z-20 bg-slate-950 transition-opacity duration-300"
        style={{ opacity: fade ? 1 : 0 }}
      />
      <InteriorControls />
    </>
  );
}
