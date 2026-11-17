import { useState } from "react";
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { messageFrom } from "../../lib/errors";
import { Button, Card, Loading } from "../../app/ui/form";
import { toast } from "../../app/ui/toast";
import { useSession } from "../auth/session";
import { unwrap } from "../classes/api";
import { CONSENT_VERSION, embed } from "./identity";
import { Liveness } from "./Liveness";
import { useCamera } from "./useCamera";
import { Preview } from "./Preview";
import { useEnrolment } from "./enrolmentApi";

type Stage = "consent" | "camera" | "liveness" | "saving" | "done";

/** The reference photo the identity check compares against (PHASE_5 § 5.3). */
export function Enrolment() {
  const enrolment = useEnrolment();
  const camera = useCamera(false);
  const state = useSession();
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<Stage>("consent");
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [failed, setFailed] = useState(false);
  const userId = state.status === "ready" ? state.session?.user.id : undefined;

  function fail(message: string) {
    toast.error(message);
    setFailed(true);
  }

  async function capture() {
    if (!video || !userId) return;
    setStage("saving");
    setFailed(false);
    try {
      const face = await embed(video);
      if (face === "no_face")
        throw new Error("We couldn't see your face clearly. Try again in better light.");
      if (face === "several_faces")
        throw new Error("More than one face is in view. Be alone for the photo.");
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = Math.round((640 * video.videoHeight) / video.videoWidth);
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
      if (!blob) throw new Error("The photo could not be made.");
      const upload = await supabase.storage
        .from("enrolment")
        .upload(`${userId}/reference.jpg`, blob, { contentType: "image/jpeg", upsert: true });
      if (upload.error) throw upload.error;
      unwrap(
        await supabase.rpc("save_enrolment", {
          p_consent_version: CONSENT_VERSION,
          p_liveness_passed: true,
        }),
      );
      await queryClient.invalidateQueries({ queryKey: ["enrolment"] });
      setStage("done");
      toast.ok("Your photo is saved. You're ready for tests that check identity.");
    } catch (e) {
      fail(messageFrom(e));
      setStage("liveness");
    }
  }

  if (enrolment.isPending) return <Loading />;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-page text-text">Your photo for tests</h1>
      {stage === "consent" && (
        <Card title="Before we take it">
          {enrolment.data && (
            <p className="text-text-muted">
              You already have a photo on file. Taking a new one replaces it.
            </p>
          )}
          <ul className="list-disc space-y-1 pl-5 text-text-muted">
            <li>Tests that check identity compare your face with this photo.</li>
            <li>Your teachers can see the photo. No one else can.</li>
            <li>It is kept until you replace it or delete your account.</li>
            <li>
              The comparison happens in your browser. A failed match never fails a test: your
              teacher checks.
            </li>
          </ul>
          <Button
            onClick={() => {
              setStage("camera");
              void camera.ask();
            }}
          >
            I agree, start the camera
          </Button>
        </Card>
      )}
      {stage !== "consent" && stage !== "done" && (
        <Card title="Look at the camera">
          {camera.state.status === "asking" && <Loading />}
          {camera.state.status === "refused" && (
            <Button variant="plain" onClick={() => void camera.ask()}>
              Try again
            </Button>
          )}
          {camera.state.status === "on" && (
            <>
              <div ref={(el) => setVideo(el?.querySelector("video") ?? null)}>
                <Preview stream={camera.state.stream} />
              </div>
              {stage === "camera" && (
                <Button onClick={() => setStage("liveness")}>I'm ready</Button>
              )}
              {stage === "liveness" && (
                <Liveness
                  video={video}
                  onDone={(passed) => (passed ? void capture() : fail("The check timed out."))}
                />
              )}
              {stage === "saving" && <Loading />}
              {failed && (
                <Button
                  variant="plain"
                  onClick={() => {
                    setFailed(false);
                    setStage("camera");
                  }}
                >
                  Try again
                </Button>
              )}
            </>
          )}
        </Card>
      )}
      <Link to="/app" className="inline-block text-accent underline">
        Back to your classes
      </Link>
    </div>
  );
}
