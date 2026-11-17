import { lazy, Suspense } from "react";
import { Link } from "react-router";
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

const H2 = "text-page text-text";

export function Landing() {
  return (
    <div className="space-y-28 pb-8">
      {/* The front door is a sheet of exam paper: every line of text sits on its 2rem ruling. */}
      <section className="sheet sheet-x grid items-center gap-x-12 gap-y-8 py-16 lg:grid-cols-[1.15fr_1fr] lg:py-20">
        <div>
          <h1 className="text-[2.75rem] leading-[4rem] font-bold tracking-[-0.025em] text-text sm:text-[3.5rem]">
            Online tests, checked fairly.
          </h1>
          <p className="mt-8 max-w-xl text-title-3-regular leading-8 text-pretty text-text-muted">
            Proctorise runs tests in the browser and watches for cheating with the webcam and a
            phone, so a teacher can trust the result, and a student can trust the process.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/sign-up"
              className={buttonClass("primary", "h-12 px-6 text-headline-semibold")}
            >
              Create an account
            </Link>
            <Link to="/demo" className={buttonClass("plain", "h-12 px-6 text-headline-semibold")}>
              Try it on your camera
            </Link>
          </div>
          <p className="mt-8 text-body-regular leading-8 text-pretty text-text-muted">
            Taking a test?{" "}
            <Link to="/sign-in" className="text-text underline">
              Sign in
            </Link>
            , then join your class with the code your teacher gave you.
          </p>
        </div>
        <div className="drop-shadow-[0_16px_24px_rgb(20_27_45/0.14)] lg:rotate-[1.25deg]">
          <HeroScene />
        </div>
      </section>

      <section aria-labelledby="checks">
        <h2 id="checks" className={H2}>
          How Proctorise catches cheating
        </h2>
        <p className="mt-3 max-w-2xl text-body-regular text-text-muted">
          Each check notices one thing and keeps a picture of it. None of them fails a test on its
          own: a teacher looks at every flag and decides.{" "}
          <Link to="/demo" className="text-text underline">
            Try them on your own camera
          </Link>
          ; nothing is sent or saved.
        </p>
        <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {CHECKS.map((c) => (
            <figure key={c.title}>
              <Picture name={c.art} ratio="aspect-[8/5]" />
              <figcaption className="mt-4">
                <h3 className="text-headline-semibold text-text">{c.title}</h3>
                <p className="mt-1 text-body-regular text-text-muted">{c.text}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section aria-labelledby="flow">
        <h2 id="flow" className={H2}>
          From a flag to a decision
        </h2>
        <ol className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {FLOW.map((f, i) => (
            <li key={f.title}>
              <Picture name={f.art} ratio="aspect-[20/13]" />
              <h3 className="mt-4 flex items-baseline gap-2 text-headline-semibold text-text">
                <span className="text-text-muted tabular-nums">{i + 1}.</span>
                {f.title}
              </h3>
              <p className="mt-1 text-body-regular text-text-muted">{f.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="live" className="grid items-center gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 id="live" className={H2}>
            Every student on one screen
          </h2>
          <p className="mt-3 max-w-xl text-body-regular text-text-muted">
            The live view shows each student's progress and flags as they happen. Warn one, give
            extra time, or watch their camera live for up to two minutes. They see when you do, and
            it isn't recorded.
          </p>
          <Link
            to="/help/teachers"
            className="mt-5 inline-block text-body-medium text-text underline"
          >
            The guide for teachers
          </Link>
        </div>
        <Picture name="LivePreview" ratio="aspect-[4/3]" />
      </section>

      <section aria-labelledby="features" className="grid gap-10 lg:grid-cols-[1fr_2fr]">
        <h2 id="features" className={H2}>
          Everything a fair test needs
        </h2>
        <dl className="grid gap-x-10 sm:grid-cols-2">
          {FEATURES.map(({ title, text }) => (
            <div key={title} className="border-t border-border py-5">
              <dt className="text-headline-semibold text-text">{title}</dt>
              <dd className="mt-1 text-body-regular text-text-muted">{text}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="how">
        <h2 id="how" className={H2}>
          How it works
        </h2>
        <ol className="mt-10 grid gap-x-8 gap-y-10 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <Picture name={step.art} ratio="aspect-[12/7]" />
              <p className="mt-5 text-body-regular text-text-muted">
                {i + 1}. {step.who}
              </p>
              <h3 className="mt-1 text-headline-semibold text-text">{step.title}</h3>
              <p className="mt-1 text-body-regular text-text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-body-medium">
          <Link to="/help/teachers" className="text-text underline">
            The guide for teachers
          </Link>
          <Link to="/help/students" className="text-text underline">
            The guide for students
          </Link>
          <Link to="/privacy" className="text-text underline">
            What is recorded
          </Link>
        </div>
      </section>

      <section className="grid items-center gap-8 border-l-4 border-l-highlight bg-surface-muted p-6 sm:p-8 md:grid-cols-[1.3fr_1fr]">
        <div>
          <h2 className="text-title-2-semibold text-text">What it can't do</h2>
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
