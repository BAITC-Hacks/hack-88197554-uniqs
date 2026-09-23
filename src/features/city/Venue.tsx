"use client";

import type { EventType, Place } from "@/lib/types";
import { PALETTE, Part } from "./kit";
import { ModelOr } from "./models";

const HALF_PI = Math.PI / 2;

/** площадка обучения: узнаваемый силуэт по типу активности */
export function Venue({ place }: { place: Place }) {
  const Body = BODIES[place.eventType!];
  return (
    <ModelOr kind="venue">
      <Body />
    </ModelOr>
  );
}

/** Академия: колонны и треугольный фронтон */
function Academy() {
  const stone = "#f4efe6";
  const trim = "#8fb3d9";
  return (
    <group>
      <Part size={[7.6, 0.5, 6.8]} color={PALETTE.stone} />
      <Part position={[0, 0, 3.6]} size={[4, 0.25, 0.9]} color={PALETTE.stone} />
      <Part position={[0, 0.5, -0.85]} size={[6.4, 3, 4.1]} color={stone} />
      {[-2.8, -1.68, -0.56, 0.56, 1.68, 2.8].map((x) => (
        <Part key={x} geo="cyl8" position={[x, 0.5, 2.3]} size={[0.28, 3, 0.28]} color={PALETTE.white} />
      ))}
      <Part position={[0, 3.5, 0]} size={[7, 0.45, 5.8]} color={trim} />
      <Part geo="prism" position={[0, 3.95, 0]} size={[7, 1.5, 5.8]} color={stone} />
      <Part position={[0, 0.5, 1.2]} size={[1.3, 2, 0.12]} color={PALETTE.dark} />
    </group>
  );
}

/** Мастерские: низкий цех с пилообразной крышей и трубой */
function Workshop() {
  return (
    <group>
      <Part position={[0, 0, 0]} size={[8, 2.6, 5.5]} color="#e2a47f" />
      <Part position={[0, 1.2, 0]} size={[8.06, 0.8, 5.56]} color={PALETTE.glass} shadow={false} />
      {[-8 / 3, 0, 8 / 3].map((x) => (
        <Part key={x} geo="prism" position={[x, 2.6, 0]} size={[8 / 3, 1.3, 5.5]} color="#8d939c" />
      ))}
      <Part position={[-1, 0, 2.75]} size={[2.4, 2.1, 0.25]} color={PALETTE.dark} />
      <Part geo="cyl8" position={[2.8, 0, -1.8]} size={[0.45, 6.5, 0.45]} color="#b5553f" />
      <Part geo="cyl8" position={[2.8, 5.4, -1.8]} size={[0.5, 0.4, 0.5]} color={PALETTE.white} />
    </group>
  );
}

/** Кофейня наставников: домик с полосатым навесом и столиками */
function Coffee() {
  const stripes = 6;
  const width = 4.6;
  return (
    <group>
      <Part position={[0, 0, -0.4]} size={[width, 2.4, 3.4]} color="#f6e7cf" />
      <Part geo="prism" position={[0, 2.4, -0.4]} rotation={[0, HALF_PI, 0]} size={[3.9, 1.4, 5.1]} color={PALETTE.roof} />
      <Part position={[-1.1, 0, 1.33]} size={[0.9, 1.8, 0.12]} color={PALETTE.dark} />
      <Part position={[0.9, 0.9, 1.33]} size={[1.5, 0.9, 0.12]} color={PALETTE.glass} />
      {Array.from({ length: stripes }, (_, i) => (
        <Part
          key={i}
          center
          position={[-width / 2 + (width / stripes) * (i + 0.5), 2.05, 1.95]}
          rotation={[0.45, 0, 0]}
          size={[width / stripes, 0.08, 1.4]}
          color={i % 2 ? PALETTE.white : "#e0584a"}
        />
      ))}
      {[-1.4, 1.4].map((x) => (
        <group key={x} position={[x, 0, 2.7]}>
          <Part geo="cyl8" size={[0.4, 0.08, 0.4]} position={[0, 0.72, 0]} color={PALETTE.white} />
          <Part geo="cyl8" size={[0.06, 0.72, 0.06]} color={PALETTE.dark} />
        </group>
      ))}
    </group>
  );
}

/** Экзаменационный центр: строгий корпус с часами */
function Exam() {
  return (
    <group>
      <Part size={[5, 4.2, 4.2]} color="#dfe6ef" />
      <Part position={[0, 4.2, 0]} size={[5.4, 0.3, 4.6]} color="#5f7fa6" />
      <Part position={[0, 1.5, 0]} size={[5.06, 0.6, 4.26]} color={PALETTE.glass} shadow={false} />
      <Part position={[0, 0, 2.1]} size={[1.3, 1.4, 0.15]} color={PALETTE.dark} />
      <group position={[0, 3.05, 2.12]}>
        <Part center geo="cyl" rotation={[HALF_PI, 0, 0]} size={[0.95, 0.12, 0.95]} color="#5f7fa6" />
        <Part center geo="cyl" rotation={[HALF_PI, 0, 0]} position={[0, 0, 0.04]} size={[0.8, 0.12, 0.8]} color={PALETTE.white} />
        <Part center position={[0, 0.25, 0.12]} size={[0.09, 0.55, 0.04]} color={PALETTE.dark} shadow={false} />
        <Part center position={[0.2, 0, 0.12]} size={[0.45, 0.09, 0.04]} color={PALETTE.dark} shadow={false} />
      </group>
    </group>
  );
}

/** Амфитеатр: полукруг ступенчатых рядов вокруг сцены */
function Amphitheatre() {
  const tiers = 4;
  const segments = 9;
  const step = Math.PI / segments;
  return (
    <group>
      <Part geo="cyl" size={[1.8, 0.4, 1.8]} color={PALETTE.wood} />
      <Part geo="cyl" position={[0, 0.4, 0]} size={[1.5, 0.05, 1.5]} color="#e0b34a" shadow={false} />
      {Array.from({ length: tiers }, (_, t) => {
        const r = 2.4 + t * 0.8;
        const w = 2 * r * Math.sin(step / 2) + 0.05;
        return Array.from({ length: segments }, (_, k) => {
          const a = HALF_PI + step * (k + 0.5);
          return (
            <Part
              key={`${t}-${k}`}
              position={[r * Math.sin(a), 0, r * Math.cos(a)]}
              rotation={[0, a, 0]}
              size={[w, 0.45 * (t + 1), 0.82]}
              color={t % 2 ? "#e9dcc3" : "#d8c7a5"}
            />
          );
        });
      })}
    </group>
  );
}

/** Вокзал: платформа с навесом и короткий путь с вагоном */
function Station() {
  return (
    <group>
      <Part position={[0, 0, 1]} size={[9, 0.6, 3]} color={PALETTE.stone} />
      {[-3.6, 3.6].flatMap((x) =>
        [0.2, 1.8].map((z) => <Part key={`${x}-${z}`} geo="cyl8" position={[x, 0.6, z]} size={[0.12, 2.8, 0.12]} color={PALETTE.dark} />),
      )}
      <Part position={[0, 3.4, 1]} size={[8.4, 0.25, 2.6]} color="#5c7fa3" />
      <Part position={[2, 0.6, 1.4]} size={[1.8, 0.45, 0.5]} color={PALETTE.wood} />
      {Array.from({ length: 9 }, (_, i) => (
        <Part key={i} position={[-4.4 + i * 1.1, 0, -1.8]} size={[0.3, 0.08, 1.7]} color={PALETTE.wood} shadow={false} />
      ))}
      {[-1.3, -2.3].map((z) => (
        <Part key={z} position={[0, 0.08, z]} size={[10, 0.1, 0.1]} color={PALETTE.greyDark} shadow={false} />
      ))}
      <Part position={[-1.5, 0.3, -1.8]} size={[4, 1.9, 1.4]} color="#d9574a" />
      <Part position={[-1.5, 1.2, -1.8]} size={[4.04, 0.5, 1.44]} color={PALETTE.glass} shadow={false} />
      <Part position={[-1.5, 2.2, -1.8]} size={[4.1, 0.15, 1.5]} color={PALETTE.white} />
    </group>
  );
}

/** ЦОН: плоское госздание с флагштоком */
function Con() {
  return (
    <group>
      <Part size={[7, 3.2, 4.4]} color="#eef0f3" />
      <Part position={[0, 3.2, 0]} size={[7.3, 0.3, 4.7]} color="#2f6f9f" />
      <Part position={[0, 1.2, 0]} size={[7.06, 0.9, 4.46]} color={PALETTE.glass} shadow={false} />
      {[-2.4, -0.8, 0.8, 2.4].map((x) => (
        <Part key={x} position={[x, 0, 2.25]} size={[0.25, 3.2, 0.15]} color="#2f6f9f" />
      ))}
      <Part position={[0, 2.45, 2.25]} size={[2.6, 0.5, 0.1]} color="#00a0c6" />
      <Part position={[0, 0, 2.25]} size={[1.2, 1.8, 0.12]} color={PALETTE.dark} />
      <group position={[3.1, 0, 2.6]}>
        <Part geo="cyl8" size={[0.07, 7, 0.07]} color={PALETTE.greyDark} />
        <Part center position={[0.85, 6.35, 0]} size={[1.6, 1, 0.05]} color="#00afca" />
        <Part center geo="cyl" rotation={[HALF_PI, 0, 0]} position={[0.85, 6.4, 0.03]} size={[0.2, 0.03, 0.2]} color="#fec50c" shadow={false} />
      </group>
    </group>
  );
}

const BODIES: Record<EventType, () => React.JSX.Element> = {
  course: Academy,
  workshop: Workshop,
  mentoring: Coffee,
  certification: Exam,
  meetup: Amphitheatre,
  onboarding: Station,
  compliance: Con,
};
