import { Art, Brackets, CamView, Chip, Cursor, Person, Tick, type Tone } from "./parts";

/*
 * The landing page's illustrations below the hero, loaded on demand (Landing.tsx) so they stay out
 * of the first-load budget. Each check's scene shows what the code in src/features/proctoring
 * really notices, labelled with its words from labels.ts. Animations live in art.css; without
 * motion, every scene rests on the moment the check is flagged.
 */

const DESK = <rect className="a-desk" y={176} width={320} height={24} />;

/** multiple_faces */
export function ArtSecondPerson() {
  return (
    <Art w={320} h={200}>
      <CamView w={320} h={200}>
        <g className="il-peek">
          <Person x={252} y={104} s={0.82} skin={2} hair={2} shirt={2} />
        </g>
        <Person x={150} y={96} />
        <Brackets x={120} y={62} w={60} h={68} tone="ok" />
        <g className="il-peek">
          <g className="il-late">
            <Brackets x={228} y={76} w={48} h={56} tone="high" />
          </g>
        </g>
        {DESK}
      </CamView>
      <Chip x={14} y={162} tone="high" label="Another person in view" className="il-late" />
    </Art>
  );
}

/** looking_away: 8 s out of 30 on the standard preset (rules/engine.ts). */
export function ArtLookingAway() {
  return (
    <Art w={320} h={200}>
      <CamView w={320} h={200}>
        <Person x={160} y={96} skin={2} hair={3} shirt={3} face="il-glance" />
        <path
          className="s-warn il-late"
          fill="none"
          strokeWidth={2}
          strokeDasharray="3 5"
          strokeLinecap="round"
          d="M138 92Q100 84 62 100"
        />
        <Brackets x={130} y={62} w={60} h={68} tone="ok" />
        <Brackets x={130} y={62} w={60} h={68} tone="warn" className="il-end" />
        {DESK}
      </CamView>
      <g transform="translate(284 36)">
        <circle className="a-panel s-line" strokeWidth={4} r={18} />
        <g transform="rotate(-90)">
          <circle
            className="s-warn il-timer"
            fill="none"
            strokeWidth={4}
            strokeLinecap="round"
            r={18}
            pathLength={100}
            strokeDasharray="100"
          />
        </g>
        <text className="a-t" textAnchor="middle" y={4}>
          8 s
        </text>
      </g>
      <Chip x={14} y={162} tone="warn" label="Looking away for long" className="il-end" />
    </Art>
  );
}

/** object_phone (object_book is the same scene with a book). */
export function ArtPhoneInView() {
  return (
    <Art w={320} h={200}>
      <CamView w={320} h={200}>
        <Person x={150} y={96} skin={3} hair={1} shirt={1} />
        <Brackets x={120} y={62} w={60} h={68} tone="ok" />
        <g className="il-lift">
          <path
            className="s-shirt1"
            fill="none"
            strokeWidth={18}
            strokeLinecap="round"
            d="M262 210L240 148"
          />
          <g transform="translate(236 118) rotate(-10)">
            <rect className="a-device" x={-15} y={-27} width={30} height={54} rx={6} />
            <rect className="a-screen-dark" x={-12} y={-23} width={24} height={44} rx={3} />
            <circle className="a-device2" cx={0} cy={-18} r={1.6} />
            <ellipse className="a-skin3" cx={2} cy={26} rx={14} ry={9} />
            <rect className="a-skin3" x={-17} y={10} width={8} height={18} rx={4} />
          </g>
          <g className="il-late">
            <Brackets x={210} y={84} w={54} h={70} tone="high" />
            <rect className="a-high" x={210} y={66} width={44} height={15} rx={4} />
            <text className="a-t-sm a-on" x={216} y={77}>
              Phone
            </text>
          </g>
        </g>
        {DESK}
      </CamView>
      <Chip x={14} y={162} tone="high" label="Phone in view" className="il-late" />
    </Art>
  );
}

/** speech: the microphone only decides, in the browser, whether someone is talking. */
export function ArtTalking() {
  return (
    <Art w={320} h={200}>
      <CamView w={320} h={200}>
        <Person x={150} y={96} skin={1} hair={2} shirt={2} talk="il-talk" />
        <g className="il-late">
          <path
            className="s-warn il-wave"
            fill="none"
            strokeWidth={2.5}
            strokeLinecap="round"
            d="M184 100q7 11 0 22"
          />
          <path
            className="s-warn il-wave il-wave2"
            fill="none"
            strokeWidth={2.5}
            strokeLinecap="round"
            d="M194 93q12 18 0 36"
          />
          <path
            className="s-warn il-wave il-wave3"
            fill="none"
            strokeWidth={2.5}
            strokeLinecap="round"
            d="M204 86q17 25 0 50"
          />
        </g>
        <Brackets x={120} y={62} w={60} h={68} tone="ok" />
        {DESK}
      </CamView>
      <g transform="translate(14 14)">
        <rect className="a-panel s-line" width={92} height={28} rx={14} />
        <path className="a-muted" d="M14 7a4 4 0 0 1 8 0v7a4 4 0 0 1-8 0z" />
        <path
          className="s-muted"
          fill="none"
          strokeWidth={1.6}
          strokeLinecap="round"
          d="M11 12a7 7 0 0 0 14 0M18 19v3"
        />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect
            key={i}
            className={`a-warn il-bar il-bar${i % 3}`}
            x={34 + i * 8}
            y={7}
            width={4}
            height={14}
            rx={2}
          />
        ))}
      </g>
      <g transform="translate(206 14)">
        <rect className="a-panel s-line" width={100} height={28} rx={14} />
        <text className="a-t-sm a-muted" x={50} y={18} textAnchor="middle">
          No sound kept
        </text>
      </g>
      <Chip x={14} y={162} tone="warn" label="Talking" className="il-late" />
    </Art>
  );
}

/** tab_hidden and window_blur: browser facts, exact to the second. */
export function ArtLeftPage() {
  const lines = (y: number, ws: number[], cls = "a-wall2") =>
    ws.map((w, i) => (
      <rect key={i} className={cls} x={18} y={y + i * 14} width={w} height={7} rx={3.5} />
    ));
  return (
    <Art w={320} h={200}>
      <rect className="a-wall" width={320} height={200} rx={16} />
      <g transform="translate(24 18)">
        <rect className="a-panel s-line chip-shadow" width={272} height={150} rx={10} />
        <path className="a-wall2" d="M0 10A10 10 0 0 1 10 0H262A10 10 0 0 1 272 10V32H0Z" />
        {[14, 24, 34].map((cx) => (
          <circle key={cx} className="a-line" cx={cx} cy={16} r={3} />
        ))}
        <rect className="a-panel il-tab-a" x={46} y={7} width={84} height={25} rx={6} />
        <rect className="a-panel il-tab-b" x={134} y={7} width={84} height={25} rx={6} />
        <circle className="a-ok" cx={58} cy={19.5} r={3.5} />
        <text className="a-t-sm" x={66} y={23}>
          Your test
        </text>
        <text className="a-t-sm a-muted" x={146} y={23}>
          New tab
        </text>
        <g className="il-page-a">
          {lines(46, [190, 150])}
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <circle
                className={i === 1 ? "a-ok" : "a-panel s-line"}
                strokeWidth={1.5}
                cx={24}
                cy={90 + i * 18}
                r={5}
              />
              <rect
                className="a-wall2"
                x={36}
                y={86 + i * 18}
                width={[110, 90, 130][i]}
                height={7}
                rx={3.5}
              />
            </g>
          ))}
        </g>
        <g className="il-page-b">
          <rect className="a-wall s-line" x={56} y={50} width={160} height={24} rx={12} />
          <circle className="s-muted" fill="none" strokeWidth={1.6} cx={72} cy={62} r={5} />
          {lines(90, [220, 180, 200])}
        </g>
      </g>
      <g className="il-cursor">
        <Cursor />
      </g>
      <Chip x={14} y={162} tone="warn" label="Left the test page · 10:42" className="il-flag-mid" />
    </Art>
  );
}

/** copy_paste, context_menu and shortcut: blocked, and noted (integrity.ts). */
export function ArtShortcuts() {
  const key = (x: number, y: number, w = 16) => (
    <rect key={`${x}-${y}`} className="a-keycap" x={x} y={y} width={w} height={15} rx={3} />
  );
  return (
    <Art w={320} h={200}>
      <rect className="a-wall" width={320} height={200} rx={16} />
      <g transform="translate(38 64)">
        <rect className="a-device2" width={244} height={110} rx={12} />
        {[0, 1, 2, 3].map((row) =>
          Array.from({ length: 12 }, (_, col) =>
            row === 3 && col === 3 ? null : key(10 + col * 19, 8 + row * 19),
          ),
        )}
        {key(10, 84, 30)}
        {key(43, 84, 22)}
        {key(68, 84, 108)}
        {key(179, 84, 22)}
        {key(204, 84, 30)}
        <g className="il-press">
          <rect className="a-keycap" x={10} y={84} width={30} height={15} rx={3} />
          <rect className="a-warn il-keyglow" x={10} y={84} width={30} height={15} rx={3} />
          <text className="a-t-xs" x={25} y={94.5} textAnchor="middle">
            Ctrl
          </text>
        </g>
        <g className="il-press il-press2">
          <rect className="a-keycap" x={67} y={65} width={16} height={15} rx={3} />
          <rect className="a-warn il-keyglow" x={67} y={65} width={16} height={15} rx={3} />
          <text className="a-t-xs" x={75} y={75.5} textAnchor="middle">
            C
          </text>
        </g>
      </g>
      <g transform="translate(222 8)">
        <g className="il-copy">
          <rect className="a-panel s-line" width={36} height={44} rx={5} />
          <rect className="a-wall2" x={7} y={10} width={22} height={4} rx={2} />
          <rect className="a-wall2" x={7} y={19} width={18} height={4} rx={2} />
          <rect className="a-wall2" x={7} y={28} width={20} height={4} rx={2} />
        </g>
        <g transform="translate(44 8)">
          <g className="il-pop">
            <circle className="a-panel s-high" strokeWidth={3} cx={14} cy={14} r={13} />
            <path className="s-high" strokeWidth={3} strokeLinecap="round" d="M5 23L23 5" />
          </g>
        </g>
      </g>
      <Chip x={14} y={14} tone="warn" label="Tried to copy or paste" className="il-late" />
    </Art>
  );
}

/** second_display: `screen.isExtended`, Chrome and Edge only. */
export function ArtSecondScreen() {
  return (
    <Art w={320} h={200}>
      <rect className="a-wall" width={320} height={200} rx={16} />
      <rect className="a-desk" y={150} width={320} height={50} />
      <path
        className="s-muted il-cable"
        fill="none"
        strokeWidth={3}
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray="100"
        d="M168 146C200 150 214 168 256 150"
      />
      <g transform="translate(30 58)">
        <rect className="a-device" width={136} height={88} rx={8} />
        <rect className="a-screen" x={6} y={6} width={124} height={76} rx={4} />
        <rect className="a-ok" x={14} y={14} width={44} height={6} rx={3} />
        <rect className="a-wall2" x={14} y={28} width={96} height={6} rx={3} />
        <rect className="a-wall2" x={14} y={40} width={78} height={6} rx={3} />
        <rect className="a-wall2" x={14} y={52} width={88} height={6} rx={3} />
        <path className="a-device2" d="M-14 88H150L140 96H-4Z" />
      </g>
      <g className="il-slide">
        <g transform="translate(200 34)">
          <rect className="a-device" width={108} height={74} rx={6} />
          <rect className="a-screen-dark" x={5} y={5} width={98} height={64} rx={3} />
          <rect className="a-wall2" opacity={0.25} x={14} y={16} width={56} height={6} rx={3} />
          <rect className="a-wall2" opacity={0.25} x={14} y={28} width={40} height={6} rx={3} />
          <rect className="a-device2" x={48} y={74} width={12} height={34} />
          <rect className="a-device2" x={30} y={106} width={48} height={8} rx={3} />
        </g>
        <g className="il-late">
          <Brackets x={194} y={28} w={120} h={86} tone="warn" />
        </g>
      </g>
      <Chip x={14} y={162} tone="warn" label="Second screen connected" className="il-late" />
    </Art>
  );
}

/** phone_object and phone_person: the phone sees what the webcam can't, below and beside the desk. */
export function ArtPhoneSideView() {
  return (
    <Art w={320} h={200}>
      <CamView w={320} h={200}>
        <rect className="a-wall2" y={186} width={320} height={14} />
        <polygon className="a-ok" opacity={0.14} points="106,54 262,24 262,88" />
        <polygon className="a-ok il-cone-phone" opacity={0.18} points="44,126 312,96 312,190" />
        <text className="a-t-xs a-muted" x={98} y={48} textAnchor="end">
          Webcam
        </text>
        <text className="a-t-xs a-ok" x={22} y={104}>
          Phone
        </text>
        {/* chair */}
        <rect className="a-device2" x={244} y={136} width={46} height={6} rx={3} />
        <rect className="a-device2" x={284} y={78} width={6} height={64} rx={3} />
        <path
          className="s-device2"
          strokeWidth={4}
          strokeLinecap="round"
          d="M252 142L246 186M282 142L288 186"
        />
        {/* desk and laptop */}
        <rect className="a-desk" x={56} y={100} width={190} height={8} rx={2} />
        <path className="s-desk" strokeWidth={6} d="M68 108V186M234 108V186" />
        <rect className="a-device" x={104} y={94} width={66} height={6} rx={2} />
        <path className="s-device" strokeWidth={6} strokeLinecap="round" d="M108 96L102 54" />
        <circle className="a-ok" cx={102} cy={53} r={2.5} />
        {/* the student, side on, facing the laptop */}
        <path
          className="s-trousers"
          fill="none"
          strokeWidth={16}
          strokeLinecap="round"
          d="M256 126H210"
        />
        <path
          className="s-trousers"
          fill="none"
          strokeWidth={12}
          strokeLinecap="round"
          d="M206 128V178"
        />
        <ellipse className="a-device" cx={198} cy={184} rx={12} ry={4} />
        <path
          className="a-shirt3"
          d="M232 72C248 70 260 84 262 100L264 130H232C226 110 224 90 232 72Z"
        />
        <path
          className="s-shirt3"
          fill="none"
          strokeWidth={10}
          strokeLinecap="round"
          d="M242 84C236 100 214 102 176 96"
        />
        <circle className="a-skin2" cx={174} cy={96} r={5} />
        <rect className="a-skin2s" x={231} y={62} width={10} height={14} rx={4} />
        <circle className="a-skin2" cx={236} cy={54} r={16} />
        <path
          className="a-hair1"
          d="M222 48A16 16 0 0 1 253 52C253 62 249 67 245 69 244 60 240 55 233 53 228 52 224 51 222 48Z"
        />
        <circle className="a-face" cx={227} cy={53} r={1.8} />
        {/* the notes on the lap, under the desk */}
        <g transform="translate(212 108) rotate(-6)">
          <rect className="a-panel s-line" width={24} height={15} rx={2} />
          <path className="s-line" strokeWidth={1.5} d="M4 5H20M4 10H16" />
        </g>
        <g className="il-late">
          <Brackets x={206} y={102} w={36} h={26} tone="high" />
        </g>
        {/* the phone on its stand */}
        <path
          className="s-device2"
          strokeWidth={3}
          strokeLinecap="round"
          d="M38 140L28 186M38 140L48 186M38 140V186"
        />
        <rect className="a-device" x={30} y={110} width={16} height={30} rx={4} />
        <circle className="a-ok il-blink" cx={42} cy={118} r={2} />
      </CamView>
      <Chip
        x={14}
        y={10}
        tone="high"
        label="Phone or notes in the phone's view"
        className="il-late"
      />
    </Art>
  );
}

/** identity_passed / identity_mismatch: the reference photo against the live face, in the browser. */
export function ArtIdentity() {
  return (
    <Art w={320} h={200}>
      <rect className="a-wall" width={320} height={200} rx={16} />
      <g transform="translate(26 26) rotate(-4)">
        <rect className="a-panel s-line chip-shadow" width={108} height={130} rx={8} />
        <CamView x={8} y={8} w={92} h={94} r={5}>
          <Person x={46} y={44} s={0.72} skin={2} hair={1} shirt={1} />
        </CamView>
        <text className="a-t-sm a-muted" x={54} y={120} textAnchor="middle">
          Your photo
        </text>
      </g>
      <CamView x={190} y={26} w={106} h={130} r={10}>
        <Person x={53} y={60} s={0.76} skin={2} hair={1} shirt={1} />
        <rect className="a-ok il-scan" opacity={0.5} x={0} y={0} width={106} height={2} />
        <Brackets x={30} y={30} w={46} h={52} tone="ok" />
      </CamView>
      <path
        className="s-ok il-dash"
        fill="none"
        strokeWidth={1.6}
        strokeDasharray="2 5"
        strokeLinecap="round"
        d="M80 70C130 50 190 58 238 84M84 92C130 96 190 96 237 98M80 110C130 128 190 124 244 112"
      />
      <Tick x={162} y={96} className="il-pop" />
      <Chip x={94} y={164} tone="ok" label="Identity checked" className="il-late" />
    </Art>
  );
}

/* ---------- From a flag to a decision ---------- */

export function ArtFlowNoticed() {
  return (
    <Art w={200} h={130}>
      <CamView w={200} h={130} r={12}>
        <Person x={92} y={62} s={0.7} skin={3} hair={3} shirt={2} />
        <g transform="translate(146 82) rotate(-10)">
          <rect className="a-device" x={-10} y={-18} width={20} height={36} rx={4} />
          <ellipse className="a-skin3" cx={1} cy={17} rx={10} ry={6} />
        </g>
        <Brackets x={130} y={58} w={34} h={48} tone="high" className="il-blink" />
      </CamView>
    </Art>
  );
}

export function ArtFlowPicture() {
  return (
    <Art w={200} h={130}>
      <rect className="a-wall" width={200} height={130} rx={12} />
      <g transform="translate(62 18) rotate(6)">
        <rect className="a-panel s-line" width={92} height={86} rx={6} />
      </g>
      <g transform="translate(44 14) rotate(-3)">
        <rect className="a-panel s-line chip-shadow" width={96} height={92} rx={6} />
        <CamView x={6} y={6} w={84} h={62} r={4}>
          <Person x={38} y={34} s={0.5} skin={3} hair={3} shirt={2} />
          <rect className="a-device" x={58} y={38} width={12} height={22} rx={3} />
        </CamView>
        <text className="a-t-xs a-muted" x={8} y={84}>
          10:42:07
        </text>
        <rect className="a-white il-flash" x={6} y={6} width={84} height={62} rx={4} />
      </g>
    </Art>
  );
}

export function ArtFlowReview() {
  return (
    <Art w={200} h={130}>
      <rect className="a-wall" width={200} height={130} rx={12} />
      <g transform="translate(14 16)">
        <rect className="a-panel s-line chip-shadow" width={172} height={98} rx={8} />
        <CamView x={10} y={10} w={56} h={42} r={4}>
          <Person x={26} y={24} s={0.36} skin={3} hair={3} shirt={2} />
        </CamView>
        <text className="a-t-xs a-high" x={74} y={22}>
          High
        </text>
        <text className="a-t-xs" x={74} y={36}>
          Phone in view
        </text>
        <text className="a-t-xs a-muted" x={74} y={49}>
          10:42:07, for 6 s
        </text>
        <g>
          <rect className="a-panel s-line" x={10} y={64} width={64} height={22} rx={6} />
          <text className="a-t-xs" x={42} y={78.5} textAnchor="middle">
            Dismiss
          </text>
          <rect className="a-panel s-line" x={80} y={64} width={64} height={22} rx={6} />
          <rect
            className="a-ok il-confirm"
            opacity={0.15}
            x={80}
            y={64}
            width={64}
            height={22}
            rx={6}
          />
          <text className="a-t-xs" x={112} y={78.5} textAnchor="middle">
            Confirm
          </text>
        </g>
      </g>
      <g className="il-cursor-review">
        <Cursor />
      </g>
    </Art>
  );
}

export function ArtFlowReleased() {
  return (
    <Art w={200} h={130}>
      <rect className="a-wall" width={200} height={130} rx={12} />
      <g transform="translate(40 14)">
        <rect className="a-panel s-line chip-shadow" width={120} height={102} rx={10} />
        <text className="a-t-xs a-muted" x={60} y={24} textAnchor="middle">
          Science 1 · Unit test
        </text>
        <text className="a-t-lg" x={60} y={60} textAnchor="middle">
          18 / 20
        </text>
        <g className="il-pop">
          <rect className="a-ok" opacity={0.14} x={22} y={74} width={76} height={18} rx={9} />
          <text className="a-t-xs a-ok" x={60} y={86.5} textAnchor="middle">
            Released
          </text>
        </g>
      </g>
    </Art>
  );
}

/* ---------- How it works: one picture per step ---------- */

export function ArtStepTeacher() {
  return (
    <Art w={240} h={140}>
      <rect className="a-wall" width={240} height={140} rx={12} />
      <g transform="translate(20 16)">
        <rect className="a-panel s-line chip-shadow" width={200} height={108} rx={10} />
        <text className="a-t" x={14} y={24}>
          Science 1
        </text>
        <rect className="a-wall2" x={96} y={10} width={94} height={20} rx={10} />
        <text className="a-t-xs a-muted" x={143} y={23.5} textAnchor="middle">
          Code K7Q2M9XA
        </text>
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect
              className="a-wall2"
              x={36}
              y={44 + i * 20}
              width={[120, 96, 136][i]}
              height={8}
              rx={4}
            />
            <Tick x={22} y={48 + i * 20} className={`il-seq il-seq${i}`} />
          </g>
        ))}
      </g>
    </Art>
  );
}

export function ArtStepStudent() {
  const rows = ["Camera", "Microphone", "Your photo"];
  return (
    <Art w={240} h={140}>
      <rect className="a-wall" width={240} height={140} rx={12} />
      <g transform="translate(20 16)">
        <rect className="a-panel s-line chip-shadow" width={200} height={108} rx={10} />
        {rows.map((label, i) => (
          <g key={label}>
            <text className="a-t-sm" x={14} y={24 + i * 19}>
              {label}
            </text>
            <Tick x={182} y={20 + i * 19} className={`il-seq il-seq${i}`} />
          </g>
        ))}
        <g className="il-start">
          <rect className="a-ok" x={14} y={72} width={172} height={22} rx={7} />
          <text className="a-t-sm a-on" x={100} y={87} textAnchor="middle">
            Start the test
          </text>
        </g>
      </g>
    </Art>
  );
}

export function ArtStepReview() {
  const rows: { label: string; tone: Tone; verdict: string }[] = [
    { label: "Looking away for long", tone: "warn", verdict: "Dismissed" },
    { label: "Phone in view", tone: "high", verdict: "Confirmed" },
  ];
  return (
    <Art w={240} h={140}>
      <rect className="a-wall" width={240} height={140} rx={12} />
      <g transform="translate(20 16)">
        <rect className="a-panel s-line chip-shadow" width={200} height={108} rx={10} />
        {rows.map((r, i) => (
          <g key={r.label}>
            <circle className={`a-${r.tone}`} cx={18} cy={22 + i * 24} r={4} />
            <text className="a-t-xs" x={28} y={26 + i * 24}>
              {r.label}
            </text>
            <text
              className={`a-t-xs a-muted il-seq il-seq${i}`}
              x={188}
              y={26 + i * 24}
              textAnchor="end"
            >
              {r.verdict}
            </text>
          </g>
        ))}
        <g className="il-start">
          <rect className="a-ok" x={14} y={76} width={172} height={22} rx={7} />
          <text className="a-t-sm a-on" x={100} y={91} textAnchor="middle">
            Release results to students
          </text>
        </g>
      </g>
    </Art>
  );
}

/* ---------- What it can't do ---------- */

/** Seen from above: what the webcam and the phone cover, and what neither does. */
export function ArtBlindSpots() {
  return (
    <Art w={320} h={200}>
      <rect className="a-wall" width={320} height={200} rx={16} />
      <rect
        className="a-panel s-muted"
        strokeDasharray="4 5"
        strokeWidth={1.5}
        opacity={0.9}
        x={222}
        y={14}
        width={84}
        height={84}
        rx={10}
      />
      <rect
        className="a-device2 il-ghost"
        opacity={0.35}
        x={244}
        y={36}
        width={40}
        height={26}
        rx={3}
      />
      <text className="a-t-xs a-muted" x={264} y={84} textAnchor="middle">
        Out of view
      </text>
      <polygon className="a-ok" opacity={0.16} points="150,86 98,186 202,186" />
      <polygon className="a-ok" opacity={0.12} points="36,150 210,112 210,196" />
      <rect className="a-desk" x={70} y={44} width={160} height={70} rx={6} />
      <rect className="a-device" x={118} y={64} width={64} height={22} rx={3} />
      <rect className="a-device2" x={118} y={84} width={64} height={4} rx={2} />
      <circle className="a-ok" cx={150} cy={87} r={2.5} />
      <ellipse className="a-shirt1" cx={150} cy={150} rx={34} ry={16} />
      <circle className="a-hair1" cx={150} cy={146} r={14} />
      <rect className="a-device" x={26} y={140} width={14} height={22} rx={3} />
      <text className="a-t-xs a-muted" x={104} y={196}>
        Webcam
      </text>
      <text className="a-t-xs a-muted" x={22} y={178}>
        Phone
      </text>
    </Art>
  );
}

/* ---------- The teacher's live view ---------- */

const PREVIEW = [
  { name: "Aarav", status: "Writing", tone: "ok", progress: 70, skin: 1, hair: 1, shirt: 1 },
  { name: "Diya", status: "Looking away", tone: "warn", progress: 45, skin: 2, hair: 2, shirt: 3 },
  { name: "Kabir", status: "Writing", tone: "ok", progress: 85, skin: 3, hair: 1, shirt: 2 },
  {
    name: "Meera",
    status: "Another person",
    tone: "high",
    progress: 30,
    skin: 1,
    hair: 3,
    shirt: 2,
  },
  { name: "Rohan", status: "Handed in", tone: "done", progress: 100, skin: 2, hair: 1, shirt: 1 },
  { name: "Sana", status: "Writing", tone: "ok", progress: 60, skin: 3, hair: 2, shirt: 3 },
] as const;

const TONE = {
  ok: "bg-accent/10 text-accent",
  warn: "bg-warn/10 text-warn",
  high: "bg-high/10 text-high",
  done: "bg-surface-muted text-text-muted",
} as const;

/** A picture of the teacher's live view; decorative, so hidden from readers. */
export function LivePreview() {
  return (
    <div
      aria-hidden
      className="rounded-3xl border border-border bg-surface-muted p-3 shadow-xl shadow-black/5"
    >
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-headline-semibold text-text">Science 1 · Unit test</p>
            <p className="text-caption-1-regular text-text-muted">6 students · 24 minutes left</p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-high/10 px-2.5 py-1 text-caption-1-semibold text-high">
            <span className="size-1.5 animate-pulse rounded-full bg-high" />
            Live
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {PREVIEW.map((s) => (
            <div key={s.name} className="rounded-xl border border-border p-2.5">
              <Art w={120} h={68} className="rounded-lg">
                <CamView w={120} h={68} r={6}>
                  {s.tone === "high" && (
                    <Person x={94} y={40} s={0.34} skin={3} hair={2} shirt={3} />
                  )}
                  {s.tone !== "done" && (
                    <Person
                      x={58}
                      y={38}
                      s={0.42}
                      skin={s.skin}
                      hair={s.hair}
                      shirt={s.shirt}
                      face={s.tone === "warn" ? "look-left" : undefined}
                    />
                  )}
                  {s.tone !== "done" && <Brackets x={46} y={23} w={24} h={28} tone={s.tone} />}
                </CamView>
              </Art>
              <p className="mt-2 text-caption-1-semibold text-text">{s.name}</p>
              <span
                className={`mt-1 inline-block rounded-md px-1.5 py-0.5 text-caption-1-medium ${TONE[s.tone]}`}
              >
                {s.status}
              </span>
              <div className="mt-2 h-1 rounded-full bg-surface-muted">
                <div className="h-1 rounded-full bg-accent" style={{ width: `${s.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
