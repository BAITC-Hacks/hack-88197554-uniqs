"use client";

import type { EventType, Place } from "@/lib/types";
import { PALETTE, Part, Sign, glass } from "./kit";
import { CITY, Model, RESTAURANT } from "./models";

const HALF_PI = Math.PI / 2;

/** площадка обучения: здание KayKit + узнаваемые детали и вывеска */
export function Venue({ place }: { place: Place }) {
  const Body = BODIES[place.eventType!];
  return <Body place={place} />;
}

const VENUE_COLOR: Record<EventType, string> = {
  course: "#3f6fb5",
  workshop: "#c9613f",
  mentoring: "#8a5a3c",
  certification: "#4f5f8f",
  meetup: "#5f9a4a",
  onboarding: "#2f6f9f",
  compliance: "#00879e",
};

/** мощёная площадка под зданием */
function Pad({ w, d, z = 0 }: { w: number; d: number; z?: number }) {
  return <Part position={[0, 0, z]} size={[w, 0.12, d]} color={PALETTE.sidewalk} shadow={false} />;
}

/** Академия: строгий корпус с портиком из колонн */
function Academy({ place }: { place: Place }) {
  return (
    <group>
      <Pad w={11} d={11} />
      <Model url={CITY.buildingG} position={[0, 0.12, -1.2]} scale={3.6} />
      {/* портик */}
      <Part position={[0, 0.12, 3.4]} size={[7.4, 0.4, 2.6]} color={PALETTE.stone} />
      {[-2.7, -0.9, 0.9, 2.7].map((x) => (
        <Part key={x} geo="cyl" position={[x, 0.52, 3.9]} size={[0.28, 3.4, 0.28]} color={PALETTE.white} />
      ))}
      <Part position={[0, 3.92, 3.4]} size={[7.6, 0.4, 2.8]} color={PALETTE.stone} />
      <Part geo="prism" position={[0, 4.32, 3.4]} size={[7.6, 1.3, 2.8]} color={PALETTE.white} />
      <Sign text={place.name} color={VENUE_COLOR.course} width={4.6} height={0.8} position={[0, 3.1, 4.9]} />
      <Model url={CITY.bush} position={[-4.2, 0.12, 4]} scale={2.4} />
      <Model url={CITY.bush} position={[4.2, 0.12, 4]} scale={2.4} />
    </group>
  );
}

/** Мастерские: цех с трубой и воротами */
function Workshop({ place }: { place: Place }) {
  return (
    <group>
      <Pad w={11} d={10} />
      <Model url={CITY.buildingE} position={[0, 0.12, -0.6]} scale={3.4} />
      <Part geo="cyl8" position={[3.2, 0.12, -2.4]} size={[0.5, 9, 0.5]} color="#b5553f" />
      <Part geo="cyl8" position={[3.2, 9, -2.4]} size={[0.58, 0.5, 0.58]} color={PALETTE.dark} />
      <Sign text={place.name} color={VENUE_COLOR.workshop} width={4.6} height={0.8} position={[0, 4.4, 2.2]} />
      <Model url={CITY.dumpster} position={[-4.5, 0.12, 2.6]} scale={3} rotation={[0, 0.4, 0]} />
      <Model url={CITY.boxA} position={[-3.6, 0.12, 3.4]} scale={3} />
      <Model url={CITY.boxA} position={[-3.1, 0.12, 3.9]} scale={2.6} rotation={[0, 0.7, 0]} />
    </group>
  );
}

/** Кофейня наставников: домик с полосатым навесом и столиками на улице */
function Coffee({ place }: { place: Place }) {
  const stripes = 7;
  const width = 4.6;
  return (
    <group>
      <Pad w={9} d={9} z={0.5} />
      <Model url={CITY.buildingA} position={[0, 0.12, -1.6]} scale={3.2} />
      {Array.from({ length: stripes }, (_, i) => (
        <Part
          key={i}
          center
          position={[-width / 2 + (width / stripes) * (i + 0.5), 3.1, 1.1]}
          rotation={[0.5, 0, 0]}
          size={[width / stripes, 0.06, 1.6]}
          color={i % 2 ? PALETTE.white : "#d9534a"}
        />
      ))}
      <Sign text={place.name} color={VENUE_COLOR.mentoring} width={4.4} height={0.75} position={[0, 4.1, 0.55]} />
      {[-2.6, 2.6].map((x) => (
        <group key={x} position={[x, 0.12, 2.6]}>
          <Model url={RESTAURANT.tableRoundSmall} scale={0.85} />
          <Model url={RESTAURANT.chairA} position={[0, 0, 0.95]} scale={0.85} rotation={[0, Math.PI, 0]} />
          <Model url={RESTAURANT.chairA} position={[0, 0, -0.95]} scale={0.85} />
        </group>
      ))}
      <Model url={RESTAURANT.menu} position={[-1.3, 0.12, 3.4]} scale={1.2} rotation={[0, 0.3, 0]} />
      <Model url={CITY.bush} position={[3.8, 0.12, -0.5]} scale={2.2} />
    </group>
  );
}

/** Экзаменационный центр: строгий корпус с часами */
function Exam({ place }: { place: Place }) {
  return (
    <group>
      <Pad w={9} d={9} />
      <Model url={CITY.buildingD} position={[0, 0.12, -0.8]} scale={3} />
      <group position={[0, 5.4, 1.2]}>
        <Part center geo="cyl" rotation={[HALF_PI, 0, 0]} size={[0.95, 0.12, 0.95]} color={VENUE_COLOR.certification} />
        <Part center geo="cyl" rotation={[HALF_PI, 0, 0]} position={[0, 0, 0.05]} size={[0.8, 0.12, 0.8]} color={PALETTE.white} />
        <Part center position={[0, 0.25, 0.13]} size={[0.09, 0.55, 0.04]} color={PALETTE.dark} shadow={false} />
        <Part center position={[0.2, 0, 0.13]} size={[0.45, 0.09, 0.04]} color={PALETTE.dark} shadow={false} />
      </group>
      <Sign text={place.name} color={VENUE_COLOR.certification} width={4.6} height={0.75} position={[0, 3.5, 1.25]} />
      <Model url={CITY.bench} position={[-3.4, 0.12, 3]} scale={3} />
      <Model url={CITY.bush} position={[3.4, 0.12, 3]} scale={2.2} />
    </group>
  );
}

/** Амфитеатр: полукруг ступенчатых рядов вокруг сцены */
function Amphitheatre({ place }: { place: Place }) {
  const tiers = 4;
  const segments = 11;
  const step = Math.PI / segments;
  return (
    <group>
      <Part geo="cyl" size={[2.2, 0.45, 2.2]} color={PALETTE.wood} />
      <Part geo="cyl" position={[0, 0.45, 0]} size={[1.9, 0.05, 1.9]} color="#e0b34a" shadow={false} />
      <Part geo="cyl8" position={[-1.2, 0.5, -1]} size={[0.05, 1.3, 0.05]} color={PALETTE.dark} />
      <Part geo="sphere" position={[-1.2, 1.8, -1]} size={[0.09, 0.09, 0.09]} color={PALETTE.dark} shadow={false} />
      {Array.from({ length: tiers }, (_, t) => {
        const r = 2.8 + t * 0.85;
        const w = 2 * r * Math.sin(step / 2) + 0.05;
        return Array.from({ length: segments }, (_, k) => {
          const a = HALF_PI + step * (k + 0.5);
          return (
            <Part
              key={`${t}-${k}`}
              position={[r * Math.sin(a), 0, r * Math.cos(a)]}
              rotation={[0, a, 0]}
              size={[w, 0.42 * (t + 1), 0.85]}
              color={t % 2 ? "#e9dcc3" : "#d8c7a5"}
            />
          );
        });
      })}
      <Sign text={place.name} color={VENUE_COLOR.meetup} width={3.6} height={0.7} position={[0, 2.2, 5.2]} />
      <Part geo="cyl8" position={[0, 0, 5.2]} size={[0.07, 1.9, 0.07]} color={PALETTE.metal} />
    </group>
  );
}

/** Вокзал: платформа с навесом, путь и вагон */
function Station({ place }: { place: Place }) {
  return (
    <group>
      <Part position={[0, 0, 1.2]} size={[11, 0.6, 3.4]} color={PALETTE.stone} />
      {[-4.4, 0, 4.4].flatMap((x) =>
        [0.2, 2.2].map((z) => <Part key={`${x}-${z}`} geo="cyl8" position={[x, 0.6, z]} size={[0.12, 3.2, 0.12]} color={PALETTE.dark} />),
      )}
      <Part position={[0, 3.8, 1.2]} size={[10.4, 0.25, 3.2]} color="#5c7fa3" />
      <Part geo="prism" position={[0, 4.05, 1.2]} size={[10.4, 0.8, 3.2]} color="#4d6c8c" />
      <Model url={CITY.bench} position={[2.4, 0.6, 1.4]} scale={3} />
      <Model url={CITY.bench} position={[-2.4, 0.6, 1.4]} scale={3} />
      <Model url={CITY.trashA} position={[4.6, 0.6, 0.6]} scale={3} />
      {Array.from({ length: 12 }, (_, i) => (
        <Part key={i} position={[-6 + i * 1.1, 0, -2.2]} size={[0.3, 0.1, 2]} color={PALETTE.wood} shadow={false} />
      ))}
      {[-1.5, -2.9].map((z) => (
        <Part key={z} position={[0, 0.1, z]} size={[13, 0.12, 0.12]} color={PALETTE.greyDark} shadow={false} />
      ))}
      <group position={[-1.5, 0.3, -2.2]}>
        <Part size={[5, 2.2, 1.7]} color="#d9574a" />
        <Part position={[0, 1.2, 0]} size={[5.04, 0.6, 1.74]} material={glass("#bfe0f0", { opacity: 0.8 })} shadow={false} />
        <Part position={[0, 2.2, 0]} size={[5.1, 0.2, 1.8]} color={PALETTE.white} />
        <Part position={[2.7, 0.2, 0]} size={[0.5, 1.4, 1.5]} color="#b5453a" />
      </group>
      <Sign text={place.name} color={VENUE_COLOR.onboarding} width={3.6} height={0.7} position={[0, 4.45, 2.85]} />
    </group>
  );
}

/** ЦОН: госздание с флагом и очередью столбиков */
function Con({ place }: { place: Place }) {
  return (
    <group>
      <Pad w={10} d={9} />
      <Model url={CITY.buildingF} position={[0, 0.12, -0.6]} scale={3.2} />
      <Sign text={place.name} color={VENUE_COLOR.compliance} width={3.2} height={0.75} position={[0, 3.6, 1.55]} />
      <group position={[3.6, 0.12, 2.8]}>
        <Part geo="cyl8" size={[0.07, 7, 0.07]} color={PALETTE.greyDark} />
        <Part center position={[0.85, 6.35, 0]} size={[1.6, 1, 0.05]} color="#00afca" />
        <Part center geo="cyl" rotation={[HALF_PI, 0, 0]} position={[0.85, 6.4, 0.03]} size={[0.2, 0.03, 0.2]} color="#fec50c" shadow={false} />
      </group>
      {[-1.6, -0.8, 0, 0.8, 1.6].map((x) => (
        <Part key={x} geo="cyl8" position={[x, 0.12, 3.2]} size={[0.06, 0.9, 0.06]} color={PALETTE.metal} />
      ))}
      <Part position={[0, 0.95, 3.2]} size={[3.3, 0.04, 0.04]} color="#c0392b" shadow={false} />
    </group>
  );
}

const BODIES: Record<EventType, (p: { place: Place }) => React.JSX.Element> = {
  course: Academy,
  workshop: Workshop,
  mentoring: Coffee,
  certification: Exam,
  meetup: Amphitheatre,
  onboarding: Station,
  compliance: Con,
};
