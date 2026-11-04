import { Link } from "react-router";

const PARTS = [
  {
    title: "For teachers",
    text: "Run classes, write questions, and build tests with the checks you want. Watch them live, then review each flag with its picture and decide.",
    link: { to: "/help/teachers", label: "How it works for teachers" },
  },
  {
    title: "For students",
    text: "Take tests in your browser with your webcam on, and your phone as a side camera when the test asks. Nothing to install.",
    link: { to: "/help/students", label: "How it works for students" },
  },
  {
    title: "Fair by design",
    text: "The software notices things; a teacher decides. Nothing fails or ends your test on its own. No sound or continuous video is recorded.",
    link: { to: "/privacy", label: "What is recorded" },
  },
];

export function Landing() {
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Online tests, checked fairly.</h1>
      <p className="mt-3 max-w-2xl text-lg text-text-muted">
        Proctorise runs tests in the browser and watches for cheating with your webcam and phone, so
        a teacher can trust the result, and a student can trust the process.
      </p>
      <Link
        to="/sign-in"
        className="mt-6 inline-block rounded-md bg-accent px-4 py-2 font-medium text-accent-text hover:bg-accent-hover"
      >
        Get started
      </Link>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {PARTS.map((part) => (
          <section key={part.title} className="rounded-lg border border-border p-5">
            <h2 className="font-semibold">{part.title}</h2>
            <p className="mt-2 text-text-muted">{part.text}</p>
            <Link to={part.link.to} className="mt-3 inline-block text-sm text-accent underline">
              {part.link.label}
            </Link>
          </section>
        ))}
      </div>
      <section className="mt-12 max-w-2xl">
        <h2 className="font-semibold">What it can't do</h2>
        <p className="mt-2 text-text-muted">
          A web page can't see a second computer out of view, block your computer's own shortcuts,
          or stop someone helping from outside the camera's view. The phone camera covers some of
          that. The rest is why a teacher reviews every flag.
        </p>
      </section>
    </div>
  );
}
