import { Link } from "react-router";

const PARTS = [
  {
    title: "For teachers",
    text: "Run classes, write tests, and watch them live. After the test, you review each flag with its snapshot and decide.",
  },
  {
    title: "For students",
    text: "Take the test in your browser with your webcam on, and your phone as a side camera. Nothing to install.",
  },
  {
    title: "What it checks",
    text: "Your face stays in view, no one else is with you, no phone or notes, and you stay on the test. A person reviews every flag; the software never fails you on its own.",
  },
];

export function Landing() {
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Online tests, checked fairly.</h1>
      <p className="mt-3 max-w-2xl text-lg text-text-muted">
        Proctorise runs tests in the browser and watches for cheating with your webcam and phone, so
        a teacher can trust the result.
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
          </section>
        ))}
      </div>
    </div>
  );
}
