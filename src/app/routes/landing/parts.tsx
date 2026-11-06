import { useId, type ReactNode } from "react";
import "./art.css";

/**
 * The pieces every landing-page illustration is drawn from. Colours come from classes in art.css, so
 * the drawings follow dark mode. An element with a CSS animation never also carries a `transform`
 * attribute (the CSS would replace it): position it with an outer <g>, animate an inner one.
 */

export type Tone = "ok" | "warn" | "high";

/** An id safe inside `url(#…)`; React's own ids carry characters that need escaping there. */
function useSvgId(): string {
  return "a" + useId().replace(/[^\w-]/g, "");
}

/** A decorative drawing: hidden from screen readers, because the text beside it says the same. */
export function Art({
  w,
  h,
  className = "",
  children,
}: {
  w: number;
  h: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg viewBox={`0 0 ${w} ${h}`} aria-hidden className={`art block h-auto w-full ${className}`}>
      {children}
    </svg>
  );
}

type PersonProps = {
  x: number;
  y: number;
  s?: number;
  skin?: 1 | 2 | 3;
  hair?: 1 | 2 | 3;
  shirt?: 1 | 2 | 3;
  /** Animation class for the eyes, brows, nose and mouth together (looking away). */
  face?: string | undefined;
  /** Draws an open mouth with this animation class (talking). */
  talk?: string;
  className?: string;
};

/** A student from the chest up, head centred on (x, y). About 92 wide and 110 tall at s = 1. */
export function Person({
  x,
  y,
  s = 1,
  skin = 1,
  hair = 1,
  shirt = 1,
  face,
  talk,
  className,
}: PersonProps) {
  const skinFill = `a-skin${skin}`;
  const shade = `a-skin${skin}s`;
  const hairFill = `a-hair${hair}`;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className={className}>
        {hair === 2 && (
          <path className={hairFill} d="M-26-4C-30-36 30-36 26-4L28 30C20 38-20 38-28 30Z" />
        )}
        <path className={`a-shirt${shirt}`} d="M-46 84C-46 50-30 38 0 38S46 50 46 84Z" />
        <path className={shade} d="M-8 16H8V40C4 45-4 45-8 40Z" />
        <path className="s-panel" fill="none" strokeWidth={2} d="M-11 39L0 49 11 39" />
        <ellipse className={shade} cx={-22} cy={3} rx={4} ry={6} />
        <ellipse className={shade} cx={22} cy={3} rx={4} ry={6} />
        <ellipse className={skinFill} rx={22} ry={26} />
        <g className={face}>
          <ellipse className="a-face" cx={-8} cy={0} rx={2.4} ry={2.9} />
          <ellipse className="a-face" cx={8} cy={0} rx={2.4} ry={2.9} />
          <path
            className="s-face"
            fill="none"
            strokeWidth={1.6}
            strokeLinecap="round"
            d="M-12-8q4-3 8 0M4-8q4-3 8 0"
          />
          <path
            className="s-face"
            fill="none"
            strokeWidth={1.4}
            strokeLinecap="round"
            opacity={0.3}
            d="M1 3q3 5-1 6"
          />
          {talk ? (
            <ellipse className={`a-face ${talk}`} cx={0} cy={15} rx={4.5} ry={3} />
          ) : (
            <path
              className="s-face"
              fill="none"
              strokeWidth={1.6}
              strokeLinecap="round"
              d="M-6 13Q0 17 6 13"
            />
          )}
        </g>
        {hair === 1 && (
          <path
            className={hairFill}
            d="M-23-1C-27-33 27-35 23-3C16-14 2-19-8-17-15-16-20-10-23-1Z"
          />
        )}
        {hair === 2 && (
          <path
            className={hairFill}
            d="M-23 2C-26-30 26-32 23 2 18-12 6-18-2-18-12-17-19-10-23 2Z"
          />
        )}
        {hair === 3 && (
          <>
            <circle className={hairFill} cx={0} cy={-30} r={9} />
            <path
              className={hairFill}
              d="M-23-2C-25-30 25-30 23-2 17-15 6-19 0-19-6-19-17-15-23-2Z"
            />
          </>
        )}
      </g>
    </g>
  );
}

/** The four corners of a detection box. */
export function Brackets({
  x,
  y,
  w,
  h,
  tone,
  className = "",
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  tone: Tone;
  className?: string;
}) {
  const c = Math.min(12, w / 3, h / 3);
  return (
    <path
      className={`s-${tone} ${className}`}
      fill="none"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      d={`M${x} ${y + c}V${y}H${x + c}M${x + w - c} ${y}H${x + w}V${y + c}M${x + w} ${y + h - c}V${y + h}H${x + w - c}M${x + c} ${y + h}H${x}V${y + h - c}`}
    />
  );
}

/** An event as a teacher sees it: a coloured dot and the words from labels.ts. */
export function Chip({
  x,
  y,
  w,
  tone,
  label,
  className,
}: {
  x: number;
  y: number;
  w?: number;
  tone: Tone;
  label: string;
  className?: string;
}) {
  const width = w ?? Math.round(label.length * 6.3 + 38);
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={className}>
        <rect
          className={`a-panel s-${tone} chip-shadow`}
          strokeWidth={1.5}
          width={width}
          height={26}
          rx={13}
        />
        <circle className={`a-${tone}`} cx={14} cy={13} r={4.5} />
        <text className="a-t" x={25} y={17.5}>
          {label}
        </text>
      </g>
    </g>
  );
}

/** A webcam's view of a room: wall, window and shelf, clipped to rounded corners. */
export function CamView({
  x = 0,
  y = 0,
  w,
  h,
  r = 16,
  children,
}: {
  x?: number;
  y?: number;
  w: number;
  h: number;
  r?: number;
  children: ReactNode;
}) {
  const id = useSvgId();
  return (
    <g transform={`translate(${x} ${y})`}>
      <clipPath id={id}>
        <rect width={w} height={h} rx={r} />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <rect className="a-wall" width={w} height={h} />
        <rect
          className="a-window"
          x={w * 0.66}
          y={h * 0.12}
          width={w * 0.24}
          height={h * 0.34}
          rx={4}
        />
        <path
          className="s-wall2"
          strokeWidth={2}
          d={`M${w * 0.78} ${h * 0.12}V${h * 0.46}M${w * 0.66} ${h * 0.29}H${w * 0.9}`}
        />
        <rect className="a-wall2" x={w * 0.07} y={h * 0.3} width={w * 0.2} height={3} rx={1.5} />
        <rect
          className="a-shirt1"
          opacity={0.5}
          x={w * 0.08}
          y={h * 0.3 - 14}
          width={6}
          height={14}
          rx={1}
        />
        <rect
          className="a-shirt2"
          opacity={0.6}
          x={w * 0.08 + 8}
          y={h * 0.3 - 11}
          width={5}
          height={11}
          rx={1}
        />
        <rect
          className="a-shirt3"
          opacity={0.5}
          x={w * 0.08 + 15}
          y={h * 0.3 - 13}
          width={6}
          height={13}
          rx={1}
        />
        {children}
      </g>
      <rect className="s-line" fill="none" width={w} height={h} rx={r} />
    </g>
  );
}

/** An arrow pointer, tip at (0, 0). */
export function Cursor({ className }: { className?: string }) {
  return (
    <path
      className={`a-ink s-panel ${className ?? ""}`}
      strokeWidth={1.5}
      strokeLinejoin="round"
      d="M0 0V17L4.5 13 7.5 20 10.5 18.6 7.6 11.8H13.5Z"
    />
  );
}

/** A tick in a circle. */
export function Tick({ x, y, className }: { x: number; y: number; className?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={className}>
        <circle className="a-ok" r={8} />
        <path
          className="s-on"
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M-3.5 0.2L-1 2.8 3.8-2.4"
        />
      </g>
    </g>
  );
}
