import { useEffect, useRef, useState } from "react";

export type CameraState =
  | { status: "idle" }
  | { status: "asking" }
  | { status: "on"; stream: MediaStream }
  | { status: "refused"; message: string };

/**
 * The camera (and the microphone, if asked) for a page. Released when the page goes, unless
 * `keep()` handed the stream on to the test. The release is deferred a tick so React's
 * development double-mount does not switch the camera off under itself.
 */
export function useCamera(audio: boolean) {
  const [state, setState] = useState<CameraState>({ status: "idle" });
  const stream = useRef<MediaStream | null>(null);
  const kept = useRef(false);

  async function ask() {
    setState({ status: "asking" });
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio,
      });
      stream.current = s;
      setState({ status: "on", stream: s });
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      setState({
        status: "refused",
        message:
          name === "NotAllowedError"
            ? "The browser was not allowed to use the camera. Allow it in the address bar, then try again."
            : name === "NotFoundError"
              ? "No camera was found. Connect one, then try again."
              : "The camera could not start. Close other apps that use it, then try again.",
      });
    }
  }

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return () => {
      timer = setTimeout(() => {
        if (!kept.current) stream.current?.getTracks().forEach((t) => t.stop());
      }, 0);
      void timer;
    };
  }, []);

  return {
    state,
    ask,
    /** The test takes over the stream; this page no longer releases it. */
    keep: () => {
      kept.current = true;
      return stream.current;
    },
  };
}
