import { Link } from "react-router";
import {
  RiArrowRightLine,
  RiComputerLine,
  RiEyeLine,
  RiScalesLine,
  RiShieldCheckLine,
  RiSmartphoneLine,
  RiTimerLine,
  type RemixiconComponentType,
} from "@remixicon/react";
import { buttonClass } from "../ui/buttonClass";

type Feature = { icon: RemixiconComponentType; title: string; text: string };

const FEATURES: Feature[] = [
  {
    icon: RiComputerLine,
    title: "Nothing to install",
    text: "Tests run in the browser with the webcam on. Chrome and Edge get every check.",
  },
  {
    icon: RiSmartphoneLine,
    title: "The phone as a side camera",
    text: "When a test asks, the student pairs one phone by scanning a code. Exactly one, never two.",
  },
  {
    icon: RiScalesLine,
    title: "A teacher decides",
    text: "The software notices things and keeps a picture. Nothing fails or ends a test on its own.",
  },
  {
    icon: RiEyeLine,
    title: "Watch it live",
    text: "See every student at once, warn one, give extra time, and review each flag afterwards.",
  },
  {
    icon: RiTimerLine,
    title: "Time kept by the server",
    text: "Answers save as you go. A closed laptop still hands in on time; a late answer is refused.",
  },
  {
    icon: RiShieldCheckLine,
    title: "Collects only what it needs",
    text: "No sound or continuous video is recorded. Pictures are kept for days, not forever.",
  },
];

const STEPS = [
  {
    who: "Teacher",
    title: "Make a class and a test",
    text: "Share the join code, write or import questions, and choose the checks.",
  },
  {
    who: "Student",
    title: "Join and take the test",
    text: "A quick system check, a photo to confirm it's you, then the questions.",
  },
  {
    who: "Teacher",
    title: "Review and release",
    text: "Look at each flag with its picture, decide, and release the marks.",
  },
];

export function Landing() {
  return (
    <div className="space-y-24 pb-8">
      <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h1 className="text-display-3-bold tracking-tight text-text sm:text-display-2-bold">
            Online tests, checked fairly.
          </h1>
          <p className="mt-5 max-w-xl text-title-3-regular text-text-muted">
            Proctorise runs tests in the browser and watches for cheating with the webcam and a
            phone, so a teacher can trust the result, and a student can trust the process.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/sign-up" className={buttonClass("primary", "h-11 px-5")}>
              Create an account
              <RiArrowRightLine aria-hidden className="ml-1 size-[18px]" />
            </Link>
            <Link to="/help/teachers" className={buttonClass("plain", "h-11 px-5")}>
              How it works for teachers
            </Link>
          </div>
        </div>
        <LivePreview />
      </section>

      <section aria-labelledby="features">
        <h2 id="features" className="text-title-1-bold tracking-tight text-text">
          Everything a fair test needs
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-surface p-5 transition-shadow hover:shadow-md"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-accent/10 text-accent">
                <Icon aria-hidden className="size-5" />
              </span>
              <h3 className="mt-4 text-headline-semibold text-text">{title}</h3>
              <p className="mt-1.5 text-body-regular text-text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="how">
        <h2 id="how" className="text-title-1-bold tracking-tight text-text">
          How it works
        </h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-2xl border border-border bg-surface-muted p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-full bg-accent text-body-semibold text-accent-text">
                  {i + 1}
                </span>
                <span className="text-caption-1-semibold tracking-wide text-text-muted uppercase">
                  {step.who}
                </span>
              </div>
              <h3 className="mt-4 text-headline-semibold text-text">{step.title}</h3>
              <p className="mt-1.5 text-body-regular text-text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-body-medium text-accent">
          <Link to="/help/teachers">The guide for teachers</Link>
          <Link to="/help/students">The guide for students</Link>
          <Link to="/privacy">What is recorded</Link>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface-muted p-6 sm:p-8">
        <h2 className="text-title-3-semibold text-text">What it can't do</h2>
        <p className="mt-2 max-w-3xl text-body-regular text-text-muted">
          A web page can't see a second computer out of view, block your computer's own shortcuts,
          or stop someone helping from outside the camera's view. The phone camera covers some of
          that. The rest is why a teacher reviews every flag.
        </p>
      </section>
    </div>
  );
}

const PREVIEW = [
  { name: "Aarav", status: "Writing", tone: "ok", progress: 70 },
  { name: "Diya", status: "Looking away", tone: "warn", progress: 45 },
  { name: "Kabir", status: "Writing", tone: "ok", progress: 85 },
  { name: "Meera", status: "Second face", tone: "high", progress: 30 },
  { name: "Rohan", status: "Handed in", tone: "done", progress: 100 },
  { name: "Sana", status: "Writing", tone: "ok", progress: 60 },
] as const;

const TONE = {
  ok: "bg-accent/10 text-accent",
  warn: "bg-warn/10 text-warn",
  high: "bg-high/10 text-high",
  done: "bg-surface-muted text-text-muted",
} as const;

/** A picture of the teacher's live view, made of plain elements; decorative, so hidden from readers. */
function LivePreview() {
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
              <div className="aspect-video rounded-lg bg-linear-to-br from-surface-muted to-border/60" />
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
