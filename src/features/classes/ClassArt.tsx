import { classHash } from "./colour";

const DOTS = [0, 1, 2, 3, 4].flatMap((row) => [0, 1, 2, 3, 4, 5].map((col) => [col, row] as const));

/* Four quiet drawings; a class gets one the way it gets its colour, and keeps it. */
const ART = [
  <>
    <circle cx="96" cy="30" r="14" />
    <circle cx="96" cy="30" r="30" />
    <circle cx="96" cy="30" r="46" />
    <circle cx="96" cy="30" r="62" />
  </>,
  <g fill="currentColor" stroke="none">
    {DOTS.map(([col, row]) => (
      <circle key={`${col}-${row}`} cx={34 + col * 16} cy={8 + row * 16} r="2.5" />
    ))}
  </g>,
  <>
    <path d="M40 90 100 -10M58 90 118 -10M76 90 136 -10M94 90 154 -10M22 90 82 -10" />
  </>,
  <>
    <rect x="62" y="6" width="50" height="50" rx="6" transform="rotate(14 87 31)" />
    <rect x="44" y="30" width="34" height="34" rx="5" transform="rotate(-10 61 47)" />
    <circle cx="104" cy="66" r="10" />
  </>,
];

/** Decoration on a class's band, at the right, clear of the name. */
export function ClassArt({ classId }: { classId: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 120 80"
      preserveAspectRatio="xMaxYMid slice"
      className="pointer-events-none absolute inset-y-0 right-0 h-full w-2/5 text-white/25"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      {ART[classHash(`art${classId}`) % ART.length]}
    </svg>
  );
}
