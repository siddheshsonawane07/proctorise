import { lazy, Suspense } from "react";
import { Link } from "react-router";
import { cx } from "@/utils/cx";
import { setClass, type SetName } from "../../features/classes/colour";
import { HeroScene } from "./landing/HeroScene";

/*
 * Everything drawn below the hero comes in one chunk after the page shows (landing/art.tsx), so the
 * first-load budget pays only for the hero.
 */
const loadArt = () => import("./landing/art");
type ArtName = keyof Awaited<ReturnType<typeof loadArt>>;
const LazyArt = lazy(() =>
  loadArt().then((m) => ({
    default: function Drawn({ name }: { name: ArtName }) {
      const Drawing = m[name];
      return <Drawing />;
    },
  })),
);

/**
 * A drawing that holds its space while its chunk loads. `ratio` is a Tailwind aspect class. With a
 * `set`, it is a small stage of its own: the drawing's wall and desk take that set's colours.
 */
function Picture({ name, ratio, set }: { name: ArtName; ratio: string; set?: SetName }) {
  return (
    <div className={cx("overflow-hidden rounded-3xl", set && setClass(set))}>
      <Suspense
        fallback={<div className={`${ratio} bg-[var(--wall,var(--color-surface-muted))]`} />}
      >
        <LazyArt name={name} />
      </Suspense>
    </div>
  );
}

/** Each drawing in a row gets the next set, so the page reads as a run of little stages. */
const TILE_SETS: SetName[] = ["cobalt", "sage", "pink", "mustard", "sky", "tomato"];

/** What each check notices, in the words of src/features/proctoring. */
const CHECKS: { art: ArtName; title: string; text: string }[] = [
  {
    art: "ArtSecondPerson",
    title: "Someone else in view",
    text: "A second face in the webcam is flagged, with a picture of the moment.",
  },
  {
    art: "ArtLookingAway",
    title: "Looking away for long",
    text: "A glance is fine. Looking away from the screen for several seconds is noted.",
  },
  {
    art: "ArtPhoneInView",
    title: "A phone or notes",
    text: "The webcam spots a phone, or a book held up, and keeps a picture of it.",
  },
  {
    art: "ArtTalking",
    title: "Talking",
    text: "The microphone only tells, in the browser, whether someone is talking. No sound is kept.",
  },
  {
    art: "ArtLeftPage",
    title: "Leaving the test",
    text: "Switching tab or window, or leaving full screen, is noted to the second.",
  },
  {
    art: "ArtShortcuts",
    title: "Copy, paste and shortcuts",
    text: "Copying, pasting, right-clicking and shortcuts are blocked, and each try is noted.",
  },
  {
    art: "ArtSecondScreen",
    title: "A second screen",
    text: "Plugging in another monitor during the test is noted, in Chrome and Edge.",
  },
  {
    art: "ArtPhoneSideView",
    title: "The phone's side view",
    text: "A paired phone watches the desk from the side, where the webcam can't see.",
  },
  {
    art: "ArtIdentity",
    title: "Is it really you",
    text: "A photo taken once is compared with the face at the camera, in the browser.",
  },
];

const FLOW: { art: ArtName; title: string; text: string }[] = [
  {
    art: "ArtFlowNoticed",
    title: "Noticed",
    text: "A check sees something, such as a phone in view.",
  },
  {
    art: "ArtFlowPicture",
    title: "A picture is kept",
    text: "One still picture, with the time. Never a video.",
  },
  {
    art: "ArtFlowReview",
    title: "A teacher reviews",
    text: "They look at the picture, then confirm or dismiss the flag.",
  },
  {
    art: "ArtFlowReleased",
    title: "Results released",
    text: "Students see their marks when the teacher releases them.",
  },
];

/** What every test gets, as a list to read down, not a wall of boxes. */
const FEATURES: { title: string; text: string }[] = [
  {
    title: "Nothing to install",
    text: "Tests run in the browser with the webcam on. Chrome and Edge get every check.",
  },
  {
    title: "The phone as a side camera",
    text: "When a test asks, the student pairs one phone by scanning a code. Exactly one, never two.",
  },
  {
    title: "A teacher decides",
    text: "The software notices things and keeps a picture. Nothing fails or ends a test on its own.",
  },
  {
    title: "Watch it live",
    text: "See every student at once, warn one, give extra time, and review each flag afterwards.",
  },
  {
    title: "Time kept by the server",
    text: "Answers save as you go. A closed laptop still hands in on time; a late answer is refused.",
  },
  {
    title: "Collects only what it needs",
    text: "No sound or continuous video is recorded. Pictures are kept for days, not forever.",
  },
];

const STEPS: { who: string; title: string; text: string; art: ArtName }[] = [
  {
    art: "ArtStepTeacher",
    who: "Teacher",
    title: "Make a class and a test",
    text: "Share the join code, write or import questions, and choose the checks.",
  },
  {
    art: "ArtStepStudent",
    who: "Student",
    title: "Join and take the test",
    text: "A quick system check, a photo to confirm it's you, then the questions.",
  },
  {
    art: "ArtStepReview",
    who: "Teacher",
    title: "Review and release",
    text: "Look at each flag with its picture, decide, and release the marks.",
  },
];

/* The big heading of a section, the grotesk at poster size, and its line in the serif. */
const H2 =
  "font-display text-[clamp(2.25rem,1.4rem+3vw,4rem)] leading-[0.98] font-extrabold tracking-[-0.04em] text-balance";
const TURN = "mt-3 font-serif text-[clamp(1.6rem,1.2rem+1.6vw,2.5rem)] leading-[1.1] italic";

/** A section painted as a set, out to the window's edges (the shell clips the bleed). */
function Wall({
  set,
  className,
  children,
  ...rest
}: {
  set: SetName;
  className?: string;
  children: React.ReactNode;
  "aria-labelledby"?: string;
}) {
  return (
    <section className={cx(setClass(set), "bleed on-wall py-20 lg:py-28", className)} {...rest}>
      {children}
    </section>
  );
}

/** "> one still picture, never a video": HUMAN.md's typewritten notes. */
function Notes({ lines, className }: { lines: string[]; className?: string }) {
  return (
    <ul className={cx("caption space-y-1", className)}>
      {lines.map((line) => (
        <li key={line} className="flex gap-3">
          <span aria-hidden className="text-[var(--dot)]">
            &gt;
          </span>
          {line}
        </li>
      ))}
    </ul>
  );
}

export function Landing() {
  return (
    <div>
      {/* The front door: a cobalt wall on a sand floor, the test standing on it. */}
      <section className="set-cobalt bleed on-wall relative">
        <h1 className="stage-in pt-12 font-display text-[clamp(3rem,1.2rem+6.6vw,7.25rem)] leading-[0.9] font-extrabold tracking-[-0.05em] lg:pt-16">
          Online tests,
          <br className="max-sm:hidden" />{" "}
          <span className="font-serif font-normal tracking-[-0.01em] italic">checked fairly.</span>
        </h1>
        <div className="mt-10 grid items-end gap-x-12 gap-y-10 lg:grid-cols-[1fr_1.15fr]">
          <div className="lg:pb-24">
            <p className="max-w-xl text-title-3-regular leading-7 text-pretty on-wall-muted">
              Proctorise runs tests in the browser and watches for cheating with the webcam and a
              phone, so a teacher can trust the result, and a student can trust the process.
            </p>
            <Notes
              className="mt-6 on-wall-muted"
              lines={[
                "nothing to install",
                "a teacher decides, never the software",
                "one still picture, never a video",
              ]}
            />
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/sign-up"
                className="pill h-12 bg-pink px-6 text-headline-semibold text-ink no-underline hover:bg-[#f39abd]"
              >
                Create an account
              </Link>
              <Link
                to="/demo"
                className="pill h-12 bg-[#fbf8f2] px-6 text-headline-semibold text-ink no-underline hover:bg-white"
              >
                Try it on your camera
              </Link>
            </div>
            <p className="mt-6 text-body-regular text-pretty on-wall-muted">
              Taking a test?{" "}
              <Link to="/sign-in" className="text-current underline">
                Sign in
              </Link>
              , then join your class with the code your teacher gave you.
            </p>
          </div>
          {/* The test stands on the floor: it overlaps the sand, as a prop on a set does. */}
          <div className="hero-scene relative z-10 lg:translate-y-14">
            <HeroScene />
          </div>
        </div>
        <div aria-hidden className="floor h-16 lg:h-28" />
      </section>

      <section aria-labelledby="checks" className="py-20 lg:py-28">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <h2 id="checks" className={H2}>
            How Proctorise catches cheating
          </h2>
          <div>
            <p className="max-w-xl text-body-regular text-text-muted">
              Each check notices one thing and keeps a picture of it. None of them fails a test on
              its own: a teacher looks at every flag and decides.{" "}
              <Link to="/demo" className="text-text underline">
                Try them on your own camera
              </Link>
              ; nothing is sent or saved.
            </p>
          </div>
        </div>
        <div className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {CHECKS.map((c, i) => (
            <figure key={c.title}>
              <Picture name={c.art} ratio="aspect-[8/5]" set={TILE_SETS[i % TILE_SETS.length]!} />
              <figcaption className="mt-4">
                <h3 className="font-display text-title-3-bold tracking-[-0.015em] text-text">
                  {c.title}
                </h3>
                <p className="mt-1 text-body-regular text-text-muted">{c.text}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <Wall set="sage" aria-labelledby="flow">
        <h2 id="flow" className={H2}>
          From a flag to a decision
        </h2>
        <p className={TURN}>The software notices. A person decides.</p>
        <ol className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {FLOW.map((f, i) => (
            <li key={f.title}>
              <div className="overflow-hidden rounded-3xl bg-surface">
                <Picture name={f.art} ratio="aspect-[20/13]" />
              </div>
              <h3 className="mt-5 flex items-baseline gap-2 font-display text-title-3-bold tracking-[-0.015em]">
                <span className="font-serif text-[1.75rem] font-normal italic">{i + 1}.</span>
                {f.title}
              </h3>
              <p className="mt-1 text-body-regular on-wall-muted">{f.text}</p>
            </li>
          ))}
        </ol>
      </Wall>

      {/* HUMAN.md sets its quotes as words in pills, stacked and a little off true. */}
      <Wall set="pink" aria-labelledby="rule" className="overflow-hidden">
        <p className="caption on-wall-muted">the one rule</p>
        <h2 id="rule" className="sr-only">
          Nothing fails a test on its own
        </h2>
        <div
          aria-hidden
          className="mt-8 flex flex-col items-start gap-3 font-display text-[clamp(1.75rem,1rem+3.6vw,4rem)] leading-none font-extrabold tracking-[-0.035em]"
        >
          <span className="pill -rotate-2 bg-ink text-[#fbf8f2]">Nothing fails</span>
          <span className="pill ml-[8%] rotate-1 bg-[#fbf8f2] text-ink">a test</span>
          <span className="pill ml-[3%] -rotate-1 bg-cobalt text-[#fbf8f2]">
            <span className="font-serif font-normal tracking-normal italic">on its own.</span>
          </span>
        </div>
        <p className="mt-10 max-w-xl text-body-regular on-wall-muted">
          A flag is something the software noticed, with a picture of the moment. A teacher looks at
          it, then confirms or dismisses it.
        </p>
      </Wall>

      <section
        aria-labelledby="live"
        className="grid items-center gap-12 py-20 lg:grid-cols-[1fr_1.2fr] lg:py-28"
      >
        <div>
          <h2 id="live" className={H2}>
            Every student on one screen
          </h2>
          <p className={cx(TURN, "text-text")}>Warn one. Give extra time.</p>
          <p className="mt-6 max-w-xl text-body-regular text-text-muted">
            The live view shows each student's progress and flags as they happen. Warn one, give
            extra time, or watch their camera live for up to two minutes. They see when you do, and
            it isn't recorded.
          </p>
          <Link
            to="/help/teachers"
            className="mt-6 inline-block text-body-medium text-text underline"
          >
            The guide for teachers
          </Link>
        </div>
        <Picture name="LivePreview" ratio="aspect-[4/3]" />
      </section>

      <Wall set="ink" aria-labelledby="features">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
          <div>
            <h2 id="features" className={H2}>
              Everything a fair test needs
            </h2>
            <p className={TURN}>And nothing it doesn't.</p>
          </div>
          <dl className="grid gap-x-10 sm:grid-cols-2">
            {FEATURES.map(({ title, text }) => (
              <div key={title} className="border-t border-white/15 py-6">
                <dt className="font-display text-title-3-bold tracking-[-0.015em]">
                  <span aria-hidden className="mr-2 inline-block size-2 rounded-full bg-dot" />
                  {title}
                </dt>
                <dd className="mt-1 text-body-regular on-wall-muted">{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Wall>

      <section aria-labelledby="how" className="py-20 lg:py-28">
        <h2 id="how" className={H2}>
          How it works
        </h2>
        <p className={cx(TURN, "text-text")}>Three steps, two people.</p>
        <ol className="mt-14 grid gap-x-8 gap-y-12 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <Picture
                name={step.art}
                ratio="aspect-[12/7]"
                set={(["mustard", "sky", "sage"] as const)[i]!}
              />
              <p className="caption mt-5 text-text-muted">
                {i + 1}. {step.who.toLowerCase()}
              </p>
              <h3 className="mt-1 font-display text-title-3-bold tracking-[-0.015em] text-text">
                {step.title}
              </h3>
              <p className="mt-1 text-body-regular text-text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-wrap gap-2">
          <Link
            to="/help/teachers"
            className="pill border border-border-button-default text-body-medium text-text no-underline hover:bg-surface-muted"
          >
            The guide for teachers
          </Link>
          <Link
            to="/help/students"
            className="pill border border-border-button-default text-body-medium text-text no-underline hover:bg-surface-muted"
          >
            The guide for students
          </Link>
          <Link
            to="/privacy"
            className="pill border border-border-button-default text-body-medium text-text no-underline hover:bg-surface-muted"
          >
            What is recorded
          </Link>
        </div>
      </section>

      <Wall set="mustard" className="-mb-16">
        <div className="grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
          <div>
            <h2 className={H2}>What it can't do</h2>
            <p className={TURN}>Said plainly.</p>
            <p className="mt-6 max-w-2xl text-body-regular on-wall-muted">
              A web page can't see a second computer out of view, block your computer's own
              shortcuts, or stop someone helping from outside the camera's view. The phone camera
              covers some of that. The rest is why a teacher reviews every flag.
            </p>
          </div>
          <div className="overflow-hidden rounded-3xl bg-surface">
            <Picture name="ArtBlindSpots" ratio="aspect-[8/5]" />
          </div>
        </div>
      </Wall>
    </div>
  );
}
