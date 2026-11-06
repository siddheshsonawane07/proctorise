import { Art, Brackets, CamView, Person, Tick, type Tone } from "./parts";

const FEED: { label: string; time: string; tone: Tone; word: string }[] = [
  { label: "Identity checked", time: "10:30", tone: "ok", word: "OK" },
  { label: "Looking away for long", time: "10:41", tone: "warn", word: "Warn" },
  { label: "Phone in view", time: "10:42", tone: "high", word: "High" },
];

/**
 * The hero: a test in the browser, the webcam watching the face, the paired phone watching from the
 * side, and what they notice arriving as events for a teacher. Decorative; the copy beside it says
 * the same in words.
 */
export function HeroScene() {
  return (
    <Art w={560} h={460} className="max-w-xl justify-self-center lg:max-w-none">
      <rect className="a-wall" width={560} height={460} rx={28} />
      <circle className="a-ok" opacity={0.07} cx={470} cy={70} r={120} />
      <circle className="a-warn" opacity={0.06} cx={60} cy={420} r={110} />

      {/* laptop */}
      <rect className="a-device" x={24} y={34} width={388} height={258} rx={16} />
      <rect className="a-screen" x={36} y={48} width={364} height={232} rx={8} />
      <circle className="a-ok il-blink" cx={218} cy={41} r={3} />
      <path className="a-device2" d="M0 292H436L416 310H20Z" />
      <rect className="a-device" x={186} y={292} width={64} height={5} rx={2.5} />

      {/* the test */}
      <text className="a-t" x={56} y={76}>
        Science 1 · Unit test
      </text>
      <rect className="a-ok" opacity={0.14} x={322} y={60} width={62} height={24} rx={12} />
      <text className="a-t-sm a-ok" x={353} y={76} textAnchor="middle">
        24:00
      </text>
      <text className="a-t-xs a-muted" x={56} y={106}>
        Question 4 of 12
      </text>
      <rect className="a-wall2" x={56} y={116} width={190} height={8} rx={4} />
      <rect className="a-wall2" x={56} y={130} width={140} height={8} rx={4} />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect
            className={i === 1 ? "a-ok-soft s-ok" : "a-panel s-line"}
            strokeWidth={1.2}
            x={56}
            y={152 + i * 30}
            width={188}
            height={24}
            rx={7}
          />
          <circle
            className={i === 1 ? "a-ok" : "a-panel s-line"}
            strokeWidth={1.5}
            cx={70}
            cy={164 + i * 30}
            r={5}
          />
          <rect
            className="a-wall2"
            x={82}
            y={160 + i * 30}
            width={[110, 84, 128, 96][i]}
            height={7}
            rx={3.5}
          />
        </g>
      ))}

      {/* the webcam's view */}
      <CamView x={262} y={98} w={124} h={110} r={10}>
        <Person x={62} y={58} s={0.66} skin={2} hair={1} shirt={1} />
        <g className="il-dots">
          {[
            [57, 58],
            [67, 58],
            [62, 62],
            [62, 68],
            [52, 54],
            [72, 54],
          ].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} className="a-ok" cx={cx} cy={cy} r={1.4} />
          ))}
        </g>
        <rect className="a-ok il-scan-hero" opacity={0.45} width={124} height={2} />
        <Brackets x={44} y={36} w={36} h={42} tone="ok" />
      </CamView>
      <circle className="a-ok" cx={270} cy={222} r={4} />
      <text className="a-t-xs a-ok" x={280} y={226}>
        Face in view
      </text>

      {/* the phone, on a stand, as the side camera */}
      <path
        className="s-device2"
        strokeWidth={4}
        strokeLinecap="round"
        d="M494 290L470 338M494 290L518 338M494 290V338"
      />
      <rect className="a-device" x={448} y={118} width={92} height={174} rx={16} />
      <CamView x={455} y={128} w={78} h={154} r={10}>
        <rect className="a-wall2" y={138} width={78} height={16} />
        <rect className="a-desk" y={92} width={50} height={5} />
        <path className="s-device" strokeWidth={4} strokeLinecap="round" d="M20 90L15 62" />
        <path
          className="s-trousers"
          fill="none"
          strokeWidth={9}
          strokeLinecap="round"
          d="M60 108H38"
        />
        <path
          className="s-trousers"
          fill="none"
          strokeWidth={7}
          strokeLinecap="round"
          d="M36 110V136"
        />
        <path className="a-shirt3" d="M48 76C56 75 62 82 63 92L64 108H48C45 98 44 86 48 76Z" />
        <path
          className="s-shirt3"
          fill="none"
          strokeWidth={6}
          strokeLinecap="round"
          d="M52 84C48 92 38 92 26 88"
        />
        <circle className="a-skin2" cx={51} cy={66} r={9} />
        <path
          className="a-hair1"
          d="M43 62A9 9 0 0 1 60 64C60 69 58 72 56 73 55 68 53 65 49 64 46 64 44 63 43 62Z"
        />
        <Brackets x={6} y={50} w={66} h={92} tone="ok" />
      </CamView>
      <text className="a-t-xs a-muted" x={494} y={354} textAnchor="middle">
        Side camera
      </text>

      {/* what they notice, as the teacher sees it */}
      {FEED.map((f, i) => (
        <g key={f.label} transform={`translate(20 ${330 + i * 42})`}>
          <g className={`il-feed il-feed${i}`}>
            <rect className="a-panel s-line chip-shadow" width={292} height={36} rx={12} />
            <CamView x={6} y={5} w={38} h={26} r={6}>
              <Person x={19} y={15} s={0.2} skin={2} hair={1} shirt={1} />
            </CamView>
            <text className="a-t-sm" x={54} y={16}>
              {f.label}
            </text>
            <text className="a-t-xs a-muted" x={54} y={29}>
              {f.time}
            </text>
            <rect
              className={`a-${f.tone}`}
              opacity={0.15}
              x={236}
              y={9}
              width={46}
              height={18}
              rx={9}
            />
            <text className={`a-t-xs a-${f.tone}`} x={259} y={21.5} textAnchor="middle">
              {f.word}
            </text>
          </g>
        </g>
      ))}
      <g transform="translate(332 398)">
        <g className="il-feed il-feed3">
          <rect
            className="a-panel s-ok chip-shadow"
            strokeWidth={1.5}
            width={196}
            height={40}
            rx={20}
          />
          <Tick x={22} y={20} />
          <text className="a-t" x={38} y={24.5}>
            A teacher decides
          </text>
        </g>
      </g>
    </Art>
  );
}
