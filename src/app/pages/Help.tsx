import { Link } from "react-router";

/** One page each, for teachers and for students (PHASE_8 § 8.3, step 12). */
export function HelpTeachers() {
  return (
    <article className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-3xl font-semibold">For teachers</h1>
      <Step n={1} title="Get teacher access">
        Create an account, then use <em>Ask for teacher access</em> on your home page. The site's
        admin approves it.
      </Step>
      <Step n={2} title="Make a class">
        On your home page, create a class. Share its join code with your students. Turn joining off
        once everyone is in.
      </Step>
      <Step n={3} title="Write questions">
        Open <em>Your question bank</em>. Write questions one by one, or import a spreadsheet saved
        as CSV (download the template there).
      </Step>
      <Step n={4} title="Build and publish a test">
        In the class, make a new test: its window, time allowed, questions, and how closely to
        watch. <em>Standard</em> suits most tests. Preview it as a student, then publish.
      </Step>
      <Step n={5} title="Watch it live">
        From the test, open <em>Watch live</em>. Students needing attention come first. You can send
        a warning, add time, view a camera for two minutes, or end an attempt with a reason.
      </Step>
      <Step n={6} title="Review and release">
        Open <em>Review flags</em>. Look at each flag's picture, then dismiss or confirm it, and
        give each attempt your verdict. A flag is something noticed, not proof. Then release
        results.
      </Step>
      <p className="text-sm text-text-muted">
        On the free plan, about 95 students can take a test at the same time.
      </p>
    </article>
  );
}

export function HelpStudents() {
  return (
    <article className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-3xl font-semibold">For students</h1>
      <Step n={1} title="Before the test day">
        Join your class with the code from your teacher. If your test checks it's you, take your
        photo under <em>Your photo for tests</em>.
      </Step>
      <Step n={2} title="What you need">
        A laptop or desktop with a webcam, Chrome or Edge, a quiet room where you are alone, good
        light on your face, and one screen only. If the test uses your phone, a way to prop it up,
        and its charger.
      </Step>
      <Step n={3} title="Starting">
        Open the test from your class. The page checks your computer and tells you what to fix. The
        test opens in full screen. If it uses your phone, scan the code with it and place it to your
        side so it sees your hands, keyboard and screen.
      </Step>
      <Step n={4} title="During the test">
        Your answers save as you go, and wait on your computer if the connection drops. Stay in full
        screen and on the test page. If a warning appears, it says what was noticed and what to do.
      </Step>
      <Step n={5} title="If something breaks">
        Reload the page: your answers and the time left come back. If your phone disconnects, open
        its page again or scan the new code on your laptop.
      </Step>
      <p className="text-sm text-text-muted">
        What is recorded, and for how long:{" "}
        <Link to="/privacy" className="text-accent underline">
          Privacy
        </Link>
        .
      </p>
    </article>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold">
        {n}. {title}
      </h2>
      <p className="mt-1 text-text-muted">{children}</p>
    </section>
  );
}
