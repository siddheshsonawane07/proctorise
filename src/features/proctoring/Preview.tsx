import { useEffect, useRef } from "react";

/** Shows a stream in a video element, muted (the microphone is never played back). */
export function Preview({ stream, className = "" }: { stream: MediaStream; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
      void ref.current.play().catch(() => {});
    }
  }, [stream]);
  return (
    <video
      ref={ref}
      muted
      playsInline
      aria-label="Your camera"
      className={`aspect-[4/3] w-full rounded-lg bg-surface-muted object-cover -scale-x-100 ${className}`}
    />
  );
}
