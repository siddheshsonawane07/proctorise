import { lazy, Suspense } from "react";
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

/** A drawing that holds its space while its chunk loads. `ratio` is a Tailwind aspect class. */
function Picture({ name, ratio }: { name: ArtName; ratio: string }) {
  return (
    <Suspense fallback={<div className={`${ratio} rounded-2xl bg-surface-muted`} />}>
      <LazyArt name={name} />
    </Suspense>
  );
}

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
            <Link to="/demo" className={buttonClass("plain", "h-11 px-5")}>
              Try it on your camera
            </Link>
          </div>
        </div>
        <HeroScene />
      </section>

      <section aria-labelledby="checks">
        <h2 id="checks" className="text-title-1-bold tracking-tight text-text">
          How Proctorise catches cheating
        </h2>
        <p className="mt-3 max-w-2xl text-body-regular text-text-muted">
          Each check notices one thing and keeps a picture of it. None of them fails a test on its
          own: a teacher looks at every flag and decides.{" "}
          <Link to="/demo" className="text-accent underline">
            Try them on your own camera
          </Link>
          ; nothing is sent or saved.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CHECKS.map((c) => (
            <div key={c.title} className="rounded-2xl border border-border bg-surface p-3">
              <Picture name={c.art} ratio="aspect-[8/5]" />
              <div className="px-2 pt-4 pb-2">
                <h3 className="text-headline-semibold text-text">{c.title}</h3>
                <p className="mt-1.5 text-body-regular text-text-muted">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="flow">
        <h2 id="flow" className="text-title-1-bold tracking-tight text-text">
          From a flag to a decision
        </h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FLOW.map((f, i) => (
            <li key={f.title} className="rounded-2xl border border-border bg-surface-muted p-3">
              <Picture name={f.art} ratio="aspect-[20/13]" />
              <div className="px-2 pt-4 pb-2">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-6 place-items-center rounded-full bg-accent text-caption-1-semibold text-accent-text">
                    {i + 1}
                  </span>
                  <h3 className="text-headline-semibold text-text">{f.title}</h3>
                </div>
                <p className="mt-1.5 text-body-regular text-text-muted">{f.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="live" className="grid items-center gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 id="live" className="text-title-1-bold tracking-tight text-text">
            Every student on one screen
          </h2>
          <p className="mt-3 max-w-xl text-body-regular text-text-muted">
            The live view shows each student's progress and flags as they happen. Warn one, give
            extra time, or watch their camera live for up to two minutes. They see when you do, and
            it isn't recorded.
          </p>
          <Link to="/help/teachers" className="mt-5 inline-block text-body-medium text-accent">
            The guide for teachers
          </Link>
        </div>
        <Picture name="LivePreview" ratio="aspect-[4/3]" />
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
              <div className="-mx-2 -mt-2 mb-5">
                <Picture name={step.art} ratio="aspect-[12/7]" />
              </div>
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

      <section className="grid items-center gap-8 rounded-2xl border border-border bg-surface-muted p-6 sm:p-8 md:grid-cols-[1.3fr_1fr]">
        <div>
          <h2 className="text-title-3-semibold text-text">What it can't do</h2>
          <p className="mt-2 max-w-3xl text-body-regular text-text-muted">
            A web page can't see a second computer out of view, block your computer's own shortcuts,
            or stop someone helping from outside the camera's view. The phone camera covers some of
            that. The rest is why a teacher reviews every flag.
          </p>
        </div>
        <Picture name="ArtBlindSpots" ratio="aspect-[8/5]" />
      </section>
    </div>
  );
}
