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
        On <em>Classes</em>, choose <em>Create class</em>. Share its class code with your students.
        Turn joining off once everyone is in. <em>People</em> lists its teachers and students. Under
        the class's <em>Settings</em> you can rename it, hand it to another teacher, archive it or
        delete it.
      </Step>
      <Step n={3} title="Write questions">
        Write them inside a test with <em>Write a question</em>; each one is also kept in your{" "}
        <em>Question bank</em>, to use again. To add many at once, open the bank and import a
        spreadsheet saved as CSV (download the template there, or try the sample questions).
      </Step>
      <Step n={4} title="Build and publish a test">
        In the class, make a new test: its window, time allowed, questions, and how closely to
        watch. <em>Standard</em> suits most tests. Preview it as a student, then publish. After
        publishing you can still change its title, dates and time allowed, cancel it, copy it or
        delete it; its questions and proctoring settings are fixed.
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
      <Step n={7} title="If you are also a student">
        Your menu has a <em>Teacher</em> and <em>Student</em> switch. As a student you can join
        someone else's class and take their tests; switch back to teach.
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
        On <em>Classes</em>, choose <em>Join class</em> and type the code from your teacher. If your
        test checks it's you, take your photo under <em>Your photo</em>. You can leave a class from
        its page; your teacher keeps the results of tests you've taken.
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
        screen and on the test page. Look at the test as it starts: in the first two seconds the
        page learns where your screen is, so reading it is never taken for looking away, wherever
        your camera sits. If a warning appears, it says what was noticed and what to do, and unless
        your teacher turned sound off, it is also read aloud with a short chime. Keep your sound on.
        The rules are read aloud when you start, too.
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
