import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import type { Database } from "../../lib/database.types";
import { unwrap } from "../classes/api";

export type Overview = Database["public"]["Functions"]["live_overview"]["Returns"][number];
export type Verdict = Database["public"]["Enums"]["flag_verdict"];

export function useOverview(testId: string) {
  return useQuery({
    queryKey: ["overview", testId],
    refetchInterval: 15_000,
    queryFn: async () => unwrap(await supabase.rpc("live_overview", { p_test_id: testId })),
  });
}

export type FlagRow = {
  id: number;
  client_id: string;
  kind: string;
  severity: "info" | "warn" | "high";
  device: "laptop" | "phone";
  started_at: string;
  ended_at: string | null;
  url: string | undefined;
  verdict: Verdict | null;
  note: string | null;
};

/** An attempt's flags (warn and high), each with its snapshot (a 60 s signed URL) and review. */
export function useFlags(attemptId: string) {
  return useQuery({
    queryKey: ["flags", attemptId],
    queryFn: async (): Promise<FlagRow[]> => {
      const rows = unwrap(
        await supabase
          .from("proctor_events")
          .select(
            "id, client_id, kind, severity, device, started_at, ended_at, snapshot_path, flag_reviews(verdict, note)",
          )
          .eq("attempt_id", attemptId)
          .neq("severity", "info")
          .order("started_at"),
      );
      const paths = rows.flatMap((r) => (r.snapshot_path ? [r.snapshot_path] : []));
      const signed = paths.length
        ? unwrap(await supabase.storage.from("evidence").createSignedUrls(paths, 60))
        : [];
      const urls = new Map(signed.map((s) => [s.path, s.signedUrl]));
      return rows.map(({ snapshot_path, flag_reviews, ...r }) => ({
        ...r,
        url: snapshot_path ? (urls.get(snapshot_path) ?? undefined) : undefined,
        verdict: flag_reviews?.verdict ?? null,
        note: flag_reviews?.note ?? null,
      }));
    },
  });
}

/** The newest snapshots of an attempt, loaded only when asked for (egress, Phase-7-Critic #2). */
export function useSnapshots(attemptId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["snapshots", attemptId],
    enabled,
    queryFn: async () => {
      const rows = unwrap(
        await supabase
          .from("evidence")
          .select("path, device, source, reason, created_at")
          .eq("attempt_id", attemptId)
          .order("created_at", { ascending: false })
          .limit(12),
      );
      if (!rows.length) return [];
      const signed = unwrap(
        await supabase.storage.from("evidence").createSignedUrls(
          rows.map((r) => r.path),
          60,
        ),
      );
      const urls = new Map(signed.map((s) => [s.path, s.signedUrl]));
      return rows.map((r) => ({ ...r, url: urls.get(r.path) }));
    },
  });
}

function useRefreshing<A>(fn: (args: A) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["flags"] });
      await queryClient.invalidateQueries({ queryKey: ["overview"] });
      await queryClient.invalidateQueries({ queryKey: ["results"] });
    },
  });
}

export const useReview = () =>
  useRefreshing(async (a: { eventId: number; verdict: Verdict; note?: string }) =>
    unwrap(
      await supabase.rpc("review_flag", {
        p_event_id: a.eventId,
        p_verdict: a.verdict,
        p_note: a.note ?? "",
      }),
    ),
  );

export const useDismissKind = () =>
  useRefreshing(async (a: { attemptId: string; kind: string }) =>
    unwrap(
      await supabase.rpc("dismiss_kind", { p_attempt_id: a.attemptId, p_kind: a.kind, p_note: "" }),
    ),
  );

export const useSetIntegrity = () =>
  useRefreshing(async (a: { attemptId: string; verdict: "reviewed_ok" | "reviewed_violation" }) =>
    unwrap(
      await supabase.rpc("set_integrity", {
        p_attempt_id: a.attemptId,
        p_verdict: a.verdict,
        p_note: "",
      }),
    ),
  );

export const useWarn = () =>
  useRefreshing(async (a: { attemptId: string; message: string }) =>
    unwrap(await supabase.rpc("warn_student", { p_attempt_id: a.attemptId, p_message: a.message })),
  );

export const useExtend = () =>
  useRefreshing(async (a: { attemptId: string; minutes: number; reason: string }) =>
    unwrap(
      await supabase.rpc("extend_attempt", {
        p_attempt_id: a.attemptId,
        p_minutes: a.minutes,
        p_reason: a.reason,
      }),
    ),
  );

export const useTerminate = () =>
  useRefreshing(async (a: { attemptId: string; reason: string }) =>
    unwrap(
      await supabase.rpc("terminate_attempt", { p_attempt_id: a.attemptId, p_reason: a.reason }),
    ),
  );

export const useVoid = () =>
  useRefreshing(async (a: { attemptId: string; reason: string }) =>
    unwrap(await supabase.rpc("void_attempt", { p_attempt_id: a.attemptId, p_reason: a.reason })),
  );
