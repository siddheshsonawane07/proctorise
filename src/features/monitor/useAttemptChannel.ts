import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { answerViewRequests } from "./liveView";

export type Summary = {
  attempt_id: string;
  answered: number;
  total: number;
  camera: boolean | null;
  screen: "shared" | "stopped" | "not_required" | null;
  phone: "connected" | "gone" | "not_required" | null;
  at: number;
};

type Options = {
  attemptId: string;
  testId: string;
  camera: MediaStream | null;
  summary: () => Omit<Summary, "at">;
  onWarning: (message: string) => void;
  onDeadline: (iso: string) => void;
  onEnded: (status: string) => void;
};

/**
 * The student's side of live monitoring: warnings, extra time and ending from the teacher (over the
 * attempt's private channel, and by a 15 s check of the attempt in case a message was missed), a
 * summary to the teacher's grid every 10 s, and answering live-view requests.
 */
export function useAttemptChannel(options: Options): { viewing: boolean } {
  const [viewing, setViewing] = useState(false);
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });

  useEffect(() => {
    const { attemptId, testId } = latest.current;
    const attempt = supabase.channel(`attempt:${attemptId}`, { config: { private: true } });
    attempt
      .on("broadcast", { event: "warning" }, ({ payload }) =>
        latest.current.onWarning(String(payload.message)),
      )
      .on("broadcast", { event: "deadline" }, ({ payload }) =>
        latest.current.onDeadline(String(payload.deadline_at)),
      )
      .on("broadcast", { event: "ended" }, () => latest.current.onEnded("terminated"));
    const stopViews = answerViewRequests(attempt, () => latest.current.camera, setViewing);
    attempt.subscribe();

    const test = supabase.channel(`test:${testId}`, { config: { private: true } });
    test.subscribe();
    const summaries = setInterval(() => {
      void test.send({
        type: "broadcast",
        event: "summary",
        payload: { ...latest.current.summary(), at: Date.now() },
      });
    }, 10_000);

    const check = setInterval(async () => {
      const { data } = await supabase
        .from("attempts")
        .select("deadline_at, status")
        .eq("id", attemptId)
        .maybeSingle();
      if (!data) return;
      latest.current.onDeadline(data.deadline_at);
      if (data.status !== "in_progress") latest.current.onEnded(data.status);
    }, 15_000);

    return () => {
      clearInterval(summaries);
      clearInterval(check);
      stopViews();
      void supabase.removeChannel(attempt);
      void supabase.removeChannel(test);
    };
  }, []);

  return { viewing };
}
