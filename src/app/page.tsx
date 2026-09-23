"use client";

// Главный экран: полноэкранный город + HUD поверх. Заморожен после скелета.
import dynamic from "next/dynamic";
import { Hud } from "@/features/hud/Hud";

const CityCanvas = dynamic(() => import("@/features/city/CityCanvas"), { ssr: false });

export default function Home() {
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#cfe3c4]">
      <CityCanvas />
      <Hud />
    </main>
  );
}
