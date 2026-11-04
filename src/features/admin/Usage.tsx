import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { messageFrom } from "../../lib/errors";
import { Card, Loading, Message } from "../../app/ui/form";
import { unwrap } from "../classes/api";

type Usage = {
  database_bytes: number;
  storage_bytes: number;
  evidence_files: number;
  people: number;
  teachers: number;
  attempts_this_month: number;
  attempts_now: number;
  last_activity: string | null;
};

// Supabase free plan, checked 2026-11-04 (Research: Free Tier Limits). Re-check before relying on it.
const LIMITS = { database: 500 * 1024 ** 2, storage: 1024 ** 3, liveStudents: 95 };

/** Use against the free plan's limits, for the admin (PHASE_8 § 8.4, step 16). */
export function Usage() {
  const usage = useQuery({
    queryKey: ["admin", "usage"],
    queryFn: async () => unwrap(await supabase.rpc("admin_usage")) as unknown as Usage,
  });
  if (usage.isPending) return <Loading />;
  if (usage.isError) return <Message kind="error">{messageFrom(usage.error)}</Message>;
  const u = usage.data;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Usage</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Meter title="Database" used={u.database_bytes} limit={LIMITS.database} />
        <Meter
          title="File storage"
          used={u.storage_bytes}
          limit={LIMITS.storage}
          note={`${u.evidence_files} snapshots`}
        />
      </div>
      <Card title="Activity">
        <ul className="space-y-1 text-sm">
          <li>
            {u.people} people, {u.teachers} teachers
          </li>
          <li>{u.attempts_this_month} attempts this month</li>
          <li>
            {u.attempts_now} taking a test now (the free plan manages about {LIMITS.liveStudents} at
            once)
          </li>
          <li>
            Last activity: {u.last_activity ? new Date(u.last_activity).toLocaleString() : "none"}.
            A free project pauses after a week without any.
          </li>
        </ul>
      </Card>
    </div>
  );
}

function Meter({
  title,
  used,
  limit,
  note,
}: {
  title: string;
  used: number;
  limit: number;
  note?: string;
}) {
  const share = Math.min(1, used / limit);
  const mb = (n: number) => `${(n / 1024 ** 2).toFixed(1)} MB`;
  return (
    <Card title={title}>
      <div
        role="meter"
        aria-label={`${title} used`}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={used}
        className="h-3 overflow-hidden rounded-full bg-surface-muted"
      >
        <div
          className={`h-full ${share > 0.8 ? "bg-high" : "bg-accent"}`}
          style={{ width: `${share * 100}%` }}
        />
      </div>
      <p className="text-sm">
        {mb(used)} of {mb(limit)} ({Math.round(share * 100)}%){note && ` · ${note}`}
      </p>
    </Card>
  );
}
