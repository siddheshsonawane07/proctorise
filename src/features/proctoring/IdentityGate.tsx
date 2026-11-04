import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { Button, Card, Loading, Message } from "../../app/ui/form";
import { useSession } from "../auth/session";
import { embed, imageFrom, MATCH_THRESHOLD, similarity, type Embedding } from "./identity";
import { Liveness } from "./Liveness";
import { Preview } from "./Preview";

export type IdentityResult = { passed: boolean; score: number | null; reference: Embedding | null };

const TRIES = 3;

/**
 * The identity check at the start of an attempt: a liveness prompt, then the live face against
 * the reference photo. After three failed tries the student goes on, and the teacher is told
 * (D7); a mismatch never blocks the test.
 */
export function IdentityGate({
  camera,
  onDone,
}: {
  camera: MediaStream;
  onDone: (result: IdentityResult) => void;
}) {
  const state = useSession();
  const userId = state.status === "ready" ? state.session?.user.id : undefined;
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [tries, setTries] = useState(0);
  const [stage, setStage] = useState<"liveness" | "matching" | "retry">("liveness");
  const [error, setError] = useState<string | null>(null);

  async function match() {
    if (!video || !userId) return;
    setStage("matching");
    let reference: Embedding | null = null;
    let score: number | null = null;
    try {
      const photo = await supabase.storage.from("enrolment").download(`${userId}/reference.jpg`);
      if (photo.error) throw photo.error;
      const ref = await embed(await imageFrom(photo.data));
      const live = await embed(video);
      if (Array.isArray(ref)) reference = ref;
      if (Array.isArray(ref) && Array.isArray(live)) score = await similarity(ref, live);
    } catch {
      // Treated as a failed try; the teacher sees the result either way.
    }
    const passed = score !== null && score >= MATCH_THRESHOLD;
    if (passed) onDone({ passed, score, reference });
    else
      failTry(
        "We couldn't match your face to your photo. Face the camera in good light, then try again.",
        score,
        reference,
      );
  }

  /** A failed try (liveness or match): retry, or go on after the last one with the teacher told. */
  function failTry(
    message: string,
    score: number | null = null,
    reference: Embedding | null = null,
  ) {
    const used = tries + 1;
    setTries(used);
    if (used >= TRIES) {
      onDone({ passed: false, score, reference });
    } else {
      setError(message);
      setStage("retry");
    }
  }

  return (
    <Card title="Checking it's you">
      <div className="mx-auto max-w-sm" ref={(el) => setVideo(el?.querySelector("video") ?? null)}>
        <Preview stream={camera} />
      </div>
      {stage === "liveness" && (
        <Liveness
          video={video}
          onDone={(live) =>
            live
              ? void match()
              : failTry(
                  "We couldn't see you turn and blink. Face the camera in good light, then try again.",
                )
          }
        />
      )}
      {stage === "matching" && <Loading />}
      {stage === "retry" && (
        <>
          {error && <Message kind="error">{error}</Message>}
          <p className="text-sm text-text-muted">
            Try {tries + 1} of {TRIES}. After that you go on to the test, and your teacher checks.
          </p>
          <Button onClick={() => setStage("liveness")}>Try again</Button>
        </>
      )}
    </Card>
  );
}
