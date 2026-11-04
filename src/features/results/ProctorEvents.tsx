import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { messageFrom } from "../../lib/errors";
import { Loading, Message } from "../../app/ui/form";
import { unwrap } from "../classes/api";

const LABEL: Record<string, string> = {
  face_missing: "Face not in view",
  multiple_faces: "Another person in view",
  looking_away: "Looking away for long",
  object_phone: "Phone in view",
  object_book: "Book or notes in view",
  speech: "Talking",
  identity_mismatch: "Face didn't match the photo",
  identity_passed: "Identity checked",
  tab_hidden: "Left the test page",
  window_blur: "Switched window",
  fullscreen_exit: "Left full screen",
  screen_share_stopped: "Screen sharing stopped",
  second_display: "Second screen connected",
  camera_lost: "Camera stopped",
  copy_paste: "Tried to copy or paste",
  context_menu: "Right-clicked",
  shortcut: "Used a keyboard shortcut",
};

/** What the proctoring engine recorded on one attempt. The full review is phase 7's. */
export function ProctorEvents({ attemptId }: { attemptId: string }) {
  const events = useQuery({
    queryKey: ["events", attemptId],
    queryFn: async () => {
      const rows = unwrap(
        await supabase
          .from("proctor_events")
          .select("client_id, kind, severity, started_at, ended_at, snapshot_path")
          .eq("attempt_id", attemptId)
          .order("started_at"),
      );
      const paths = rows.flatMap((r) => (r.snapshot_path ? [r.snapshot_path] : []));
      const signed = paths.length
        ? unwrap(await supabase.storage.from("evidence").createSignedUrls(paths, 60))
        : [];
      const urls = new Map(signed.map((s) => [s.path, s.signedUrl]));
      return rows.map((r) => ({
        ...r,
        url: r.snapshot_path ? urls.get(r.snapshot_path) : undefined,
      }));
    },
  });

  if (events.isPending) return <Loading />;
  if (events.isError) return <Message kind="error">{messageFrom(events.error)}</Message>;
  if (events.data.length === 0)
    return <p className="text-sm text-text-muted">Nothing was flagged.</p>;
  return (
    <ul className="space-y-2 text-sm">
      {events.data.map((e) => {
        const seconds = e.ended_at
          ? Math.round((Date.parse(e.ended_at) - Date.parse(e.started_at)) / 1000)
          : null;
        return (
          <li key={e.client_id} className="flex flex-wrap items-center gap-3">
            <span
              className={`w-12 font-medium ${e.severity === "high" ? "text-high" : e.severity === "warn" ? "text-warn" : "text-text-muted"}`}
            >
              {e.severity === "high" ? "High" : e.severity === "warn" ? "Warn" : "Info"}
            </span>
            <span>{LABEL[e.kind] ?? e.kind}</span>
            <span className="text-text-muted">
              {new Date(e.started_at).toLocaleTimeString()}
              {seconds !== null && seconds > 0 && `, ${seconds} s`}
            </span>
            {e.url && (
              <a href={e.url} target="_blank" rel="noreferrer" className="text-accent underline">
                Snapshot
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
