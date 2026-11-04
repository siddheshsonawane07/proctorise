import { supabase } from "../../lib/supabase";

/** A still from a video: 480 px wide JPEG, about 20–30 KB (ARCHITECTURE § 7). */
export async function grabFrame(video: HTMLVideoElement): Promise<Blob | null> {
  if (video.readyState < 2 || video.videoWidth === 0) return null;
  const width = 480;
  const height = Math.round((width * video.videoHeight) / video.videoWidth);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(video, 0, 0, width, height);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.7));
}

/**
 * Reserves a slot and uploads one still. Returns the path, or null when the attempt's cap is
 * reached or the upload fails: a missing snapshot never stops the test or the event.
 */
export async function uploadSnapshot(
  attemptId: string,
  video: HTMLVideoElement,
  source: "camera" | "screen",
  reason: "thumbnail" | "event",
): Promise<string | null> {
  const blob = await grabFrame(video);
  if (!blob) return null;
  const { data: path, error } = await supabase.rpc("reserve_evidence", {
    p_attempt_id: attemptId,
    p_source: source,
    p_reason: reason,
  });
  if (error || !path) return null;
  const upload = await supabase.storage
    .from("evidence")
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  return upload.error ? null : path;
}
