/*
 * The things that stand on a stage's floor, drawn flat like the props in HUMAN.md's sets: a lamp,
 * a plant, a stool with a stack of papers, a clock on the wall. Decoration only, hidden from screen
 * readers; colours come from the set (`--floor`) and the app's tokens, so no inline style.
 */
import type { ComponentType } from "react";

export type PropName = "lamp" | "plant" | "papers" | "clock";

const SHADOW = "fill-black/15";

function Lamp() {
  return (
    <svg viewBox="0 0 120 300" aria-hidden className="h-full w-auto">
      <ellipse cx="62" cy="294" rx="44" ry="5" className={SHADOW} />
      <rect x="30" y="280" width="64" height="12" rx="6" className="fill-tomato" />
      <rect x="58" y="78" width="7" height="206" rx="3.5" className="fill-tomato" />
      <path
        d="M61 82C61 52 52 40 36 38"
        strokeWidth="7"
        strokeLinecap="round"
        className="fill-none stroke-tomato"
      />
      <path d="M30 26L48 36L48 108L0 84Z" className="fill-tomato" />
      <path d="M0 84L48 108C40 118 4 104 0 84Z" className="fill-[#fff1cf]" />
    </svg>
  );
}

function Plant() {
  return (
    <svg viewBox="0 0 150 230" aria-hidden className="h-full w-auto">
      <ellipse cx="75" cy="225" rx="46" ry="5" className={SHADOW} />
      <g className="fill-[#4f7a3a]">
        <ellipse cx="75" cy="70" rx="9" ry="62" />
        <ellipse cx="75" cy="80" rx="9" ry="58" transform="rotate(-28 75 140)" />
        <ellipse cx="75" cy="80" rx="9" ry="58" transform="rotate(28 75 140)" />
        <ellipse cx="75" cy="92" rx="8" ry="50" transform="rotate(-55 75 140)" />
        <ellipse cx="75" cy="92" rx="8" ry="50" transform="rotate(55 75 140)" />
      </g>
      <g className="fill-[#6d9a4f]">
        <ellipse cx="75" cy="84" rx="6" ry="48" transform="rotate(-12 75 140)" />
        <ellipse cx="75" cy="84" rx="6" ry="48" transform="rotate(14 75 140)" />
      </g>
      <path d="M40 140H110L102 222H48Z" className="fill-pink" />
      <rect x="34" y="134" width="82" height="14" rx="4" className="fill-pink" />
      <rect x="34" y="144" width="82" height="4" className="fill-black/10" />
    </svg>
  );
}

function Papers() {
  return (
    <svg viewBox="0 0 160 170" aria-hidden className="h-full w-auto">
      <ellipse cx="80" cy="165" rx="62" ry="5" className={SHADOW} />
      <rect x="28" y="70" width="10" height="94" rx="3" className="fill-[#c99c68]" />
      <rect x="122" y="70" width="10" height="94" rx="3" className="fill-[#c99c68]" />
      <rect x="62" y="70" width="10" height="90" rx="3" className="fill-[#b88b58]" />
      <rect x="16" y="58" width="128" height="16" rx="5" className="fill-[#ddb37f]" />
      <g transform="rotate(-4 80 40)">
        <rect x="34" y="40" width="92" height="18" rx="2" className="fill-[#f4efe4]" />
        <rect x="38" y="30" width="88" height="14" rx="2" className="fill-white" />
        <rect x="32" y="20" width="92" height="14" rx="2" className="fill-[#f4efe4]" />
        <rect x="36" y="8" width="90" height="16" rx="2" className="fill-white" />
        <rect x="46" y="12" width="9" height="9" rx="1.5" className="fill-none stroke-ink" />
        <path d="M47.5 16.5l2.5 2.5 5-6" strokeWidth="2" className="fill-none stroke-dot" />
        <rect x="60" y="14" width="44" height="3" rx="1.5" className="fill-black/20" />
      </g>
    </svg>
  );
}

function Clock() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className="h-full w-auto">
      <circle cx="52" cy="53" r="44" className="fill-black/15" />
      <circle cx="50" cy="50" r="44" className="fill-[#fbf8f2] stroke-ink" strokeWidth="6" />
      {Array.from({ length: 12 }, (_, i) => (
        <rect
          key={i}
          x="48.5"
          y="12"
          width="3"
          height={i % 3 === 0 ? 9 : 5}
          rx="1.5"
          transform={`rotate(${i * 30} 50 50)`}
          className="fill-ink"
        />
      ))}
      <rect x="47.5" y="24" width="5" height="28" rx="2.5" className="fill-ink" />
      <rect
        x="48.5"
        y="18"
        width="3"
        height="34"
        rx="1.5"
        transform="rotate(118 50 50)"
        className="fill-ink"
      />
      <circle cx="50" cy="50" r="4" className="fill-dot" />
    </svg>
  );
}

const DRAWN: Record<PropName, ComponentType> = {
  lamp: Lamp,
  plant: Plant,
  papers: Papers,
  clock: Clock,
};

/** Where each prop stands: on the floor, or hung on the wall. */
const PLACE: Record<PropName, string> = {
  lamp: "bottom-3 right-2 h-60 lg:bottom-4 lg:h-72",
  plant: "bottom-3 right-4 h-44 lg:bottom-4 lg:h-52",
  papers: "bottom-3 right-6 h-28 lg:bottom-4 lg:h-36",
  clock: "top-8 right-6 h-20 lg:top-12 lg:h-24",
};

export function StageProp({ name }: { name: PropName }) {
  const Drawn = DRAWN[name];
  return (
    <div className={`pointer-events-none absolute hidden md:block ${PLACE[name]}`}>
      <Drawn />
    </div>
  );
}
