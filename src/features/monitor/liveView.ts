import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

/** Live view ends itself after two minutes (Phase-7-Critic #5). */
export const LIVE_VIEW_MS = 2 * 60_000;

const STUN: RTCIceServer[] = [{ urls: "stun:stun.cloudflare.com:3478" }];

/**
 * STUN always; TURN credentials from the Edge Function when it is deployed, so the Cloudflare
 * credential never reaches a browser (Phase-7-Critic #6). Without it, only direct connections work.
 */
async function iceServers(): Promise<RTCIceServer[]> {
  try {
    const { data, error } = await supabase.functions.invoke("turn-credentials", { method: "POST" });
    if (!error && Array.isArray(data?.iceServers)) return [...STUN, ...data.iceServers];
  } catch {
    // Not deployed (as on the local stack): STUN only.
  }
  return STUN;
}

type Signal =
  | { request_id: string; description: RTCSessionDescriptionInit }
  | { request_id: string; candidate: RTCIceCandidateInit };

function sendOn(channel: RealtimeChannel, event: string, payload: object) {
  void channel.send({ type: "broadcast", event, payload });
}

/**
 * The student's side: answers a teacher's view request with the camera, for two minutes at most.
 * Returns a function that stops listening and closes any open view.
 */
export function answerViewRequests(
  channel: RealtimeChannel,
  stream: () => MediaStream | null,
  onViewing: (viewing: boolean) => void,
): () => void {
  let pc: RTCPeerConnection | null = null;
  let requestId: string | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const close = () => {
    if (timer) clearTimeout(timer);
    pc?.close();
    pc = null;
    requestId = null;
    onViewing(false);
  };

  channel.on("broadcast", { event: "view-request" }, async ({ payload }) => {
    const camera = stream();
    if (!camera) return;
    close();
    requestId = String(payload.request_id);
    const id = requestId;
    pc = new RTCPeerConnection({ iceServers: await iceServers() });
    for (const track of camera.getVideoTracks()) pc.addTrack(track, camera);
    pc.onicecandidate = (e) => {
      if (e.candidate)
        sendOn(channel, "signal-from-student", { request_id: id, candidate: e.candidate.toJSON() });
    };
    pc.onconnectionstatechange = () => {
      if (pc && ["failed", "closed", "disconnected"].includes(pc.connectionState)) close();
    };
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sendOn(channel, "signal-from-student", { request_id: id, description: offer });
    onViewing(true);
    timer = setTimeout(close, LIVE_VIEW_MS);
  });

  channel.on("broadcast", { event: "signal-from-teacher" }, async ({ payload }) => {
    const signal = payload as Signal;
    if (!pc || signal.request_id !== requestId) return;
    if ("description" in signal) await pc.setRemoteDescription(signal.description);
    else await pc.addIceCandidate(signal.candidate).catch(() => {});
  });

  channel.on("broadcast", { event: "view-stop" }, () => close());
  return close;
}

/**
 * The teacher's side: asks for the student's camera and calls onStream when it arrives.
 * Returns stop(). The teacher's own camera is never sent.
 */
export async function requestView(
  channel: RealtimeChannel,
  onStream: (stream: MediaStream) => void,
  onEnd: () => void,
): Promise<() => void> {
  const requestId = crypto.randomUUID();
  const pc = new RTCPeerConnection({ iceServers: await iceServers() });
  pc.addTransceiver("video", { direction: "recvonly" });
  pc.ontrack = (e) => {
    if (e.streams[0]) onStream(e.streams[0]);
  };
  pc.onicecandidate = (e) => {
    if (e.candidate)
      sendOn(channel, "signal-from-teacher", {
        request_id: requestId,
        candidate: e.candidate.toJSON(),
      });
  };
  pc.onconnectionstatechange = () => {
    if (["failed", "closed"].includes(pc.connectionState)) onEnd();
  };
  channel.on("broadcast", { event: "signal-from-student" }, async ({ payload }) => {
    const signal = payload as Signal;
    if (signal.request_id !== requestId) return;
    if ("description" in signal) {
      await pc.setRemoteDescription(signal.description);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendOn(channel, "signal-from-teacher", { request_id: requestId, description: answer });
    } else {
      await pc.addIceCandidate(signal.candidate).catch(() => {});
    }
  });
  sendOn(channel, "view-request", { request_id: requestId });
  const timer = setTimeout(() => stop(), LIVE_VIEW_MS);
  function stop() {
    clearTimeout(timer);
    sendOn(channel, "view-stop", { request_id: requestId });
    pc.close();
    onEnd();
  }
  return stop;
}
