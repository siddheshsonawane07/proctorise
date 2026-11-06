import { Link } from "react-router";

/**
 * The privacy notice (PHASE_8 § 8.1). Written from what the code captures, line by line
 * (Phase-8-Critic #1): src/features/proctoring/{session,evidence,speech,identity}.ts and
 * src/features/pairing/PhonePage.tsx. Change this page in the same change as any new capture.
 */
export function Privacy() {
  return (
    <article className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-semibold">Privacy</h1>
      <p className="text-text-muted">Last changed 6 November 2026.</p>

      <Section title="What is captured during a proctored test">
        <li>
          <strong>Still pictures from your camera</strong>: one when something is flagged (for
          example, no face in view), and one at the interval your teacher chose (every 30 seconds to
          every 5 minutes). Small, low-resolution JPEGs.
        </li>
        <li>
          <strong>Still pictures of your screen</strong>, only if the test needs screen sharing, and
          only when something is flagged.
        </li>
        <li>
          <strong>From your phone</strong>, if the test uses it as a side camera: the same kind of
          still pictures, and whether the page stayed open.
        </li>
        <li>
          <strong>Events</strong>: what was noticed and when (a face missing, another person, a
          phone in view, talking, leaving the test page or full screen, a keyboard shortcut).
        </li>
        <li>
          <strong>Your answers</strong>, and when you started and submitted.
        </li>
      </Section>

      <Section title="What is never captured">
        <li>
          No sound. The microphone is used only to tell, in your browser, whether someone is
          talking.
        </li>
        <li>
          No continuous video. Your teacher can watch your camera live for up to two minutes, you
          see when they do, and it is not recorded.
        </li>
        <li>Not what you type outside the test, or anything else on your computer.</li>
        <li>
          Nothing from the{" "}
          <Link to="/demo" className="text-accent underline">
            demo
          </Link>
          : its checks run in your browser, and no picture, sound or event leaves it.
        </li>
      </Section>

      <Section title="Your photo">
        <li>
          If a test checks it's you, you take a reference photo once. Your face is compared with it
          in your browser.
        </li>
        <li>The photo is kept until you replace it or delete your account.</li>
      </Section>

      <Section title="Who can see it">
        <li>The teachers of your class, and the site's admin. No one else.</li>
        <li>The software never fails or ends a test on its own. A teacher reviews every flag.</li>
      </Section>

      <Section title="How long it is kept">
        <li>
          Pictures are deleted 7, 30 or 90 days after the test, as the teacher set (30 by default).
        </li>
        <li>Events, answers and scores stay with your account.</li>
      </Section>

      <Section title="Where it is kept">
        <li>In a Supabase project (database and file storage) chosen by whoever runs this site.</li>
      </Section>

      <Section title="Your choices">
        <li>
          See and download everything held about you, or delete your account, on{" "}
          <Link to="/app/my-data" className="text-accent underline">
            Your data
          </Link>
          . Deleting removes your photo, your pictures, your profile and your sign-in within a day;
          your teachers keep your scores and answers without your name.
        </li>
        <li>Proctorise is for people aged 18 or older.</li>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold">{title}</h2>
      <ul className="mt-2 list-disc space-y-2 pl-5">{children}</ul>
    </section>
  );
}
