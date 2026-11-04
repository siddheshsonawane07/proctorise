import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import type { Json } from "../../lib/database.types";
import { unwrap } from "../classes/api";
import type { ViewItem } from "../questions/QuestionView";
import { useSession } from "../auth/session";
import type { Proctoring } from "../builder/proctoring";

export type AttemptPayload = {
  attempt_id: string;
  test_id: string;
  status: "in_progress" | "submitted" | "auto_submitted" | "terminated" | "voided";
  attempt_no: number;
  started_at: string;
  deadline_at: string;
  server_now: string;
  title: string;
  instructions: string;
  proctoring: Proctoring;
  items: ViewItem[];
  answers: Record<string, Json>;
};

/** One id per browser tab, so the server can tell a resume from a second tab. */
export function browserSession(): string {
  const key = "proctorise.session";
  try {
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "no-session-storage";
  }
}

export function useStartAttempt() {
  return useMutation({
    mutationFn: async (testId: string) =>
      unwrap(
        await supabase.rpc("start_attempt", { p_test_id: testId, p_session: browserSession() }),
      ) as unknown as AttemptPayload,
  });
}

export async function saveAnswer(attemptId: string, itemId: string, response: Json) {
  const { data, error } = await supabase.rpc("save_answer", {
    p_attempt_id: attemptId,
    p_item_id: itemId,
    p_response: response,
  });
  if (error) throw error;
  return data;
}

export function useSubmitAttempt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (attemptId: string) =>
      unwrap(await supabase.rpc("submit_attempt", { p_attempt_id: attemptId })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-attempts"] }),
  });
}

export type MyAttempt = {
  id: string;
  test_id: string;
  attempt_no: number;
  status: AttemptPayload["status"];
  submitted_at: string | null;
};

/** The signed-in student's own attempts. Scores are not in this table's grants. */
export function useMyAttempts() {
  const state = useSession();
  const userId = state.status === "ready" ? state.session?.user.id : undefined;
  return useQuery({
    queryKey: ["my-attempts", userId],
    enabled: !!userId,
    queryFn: async (): Promise<MyAttempt[]> =>
      unwrap(
        await supabase
          .from("attempts")
          .select("id, test_id, attempt_no, status, submitted_at")
          .eq("student_id", userId!)
          .order("attempt_no"),
      ),
  });
}

export type ResultItem = ViewItem & {
  response: Json;
  points_awarded: number | null;
  correct: Json;
  marked_by_hand?: boolean;
};

export type MyResult =
  | { released: false; status: AttemptPayload["status"] }
  | {
      released: true;
      status: AttemptPayload["status"];
      score: number;
      max_score: number;
      waiting_for_marking: boolean;
      items: ResultItem[] | null;
    };

export function useMyResult(attemptId: string) {
  return useQuery({
    queryKey: ["my-result", attemptId],
    queryFn: async () =>
      unwrap(await supabase.rpc("my_result", { p_attempt_id: attemptId })) as unknown as MyResult,
  });
}

export async function recordConsent(attemptId: string, version: string) {
  unwrap(
    await supabase.rpc("record_attempt_consent", { p_attempt_id: attemptId, p_version: version }),
  );
}
