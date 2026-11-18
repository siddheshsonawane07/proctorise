import { Stage } from "../../app/ui/Stage";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { Card, Loading, LoadFailed } from "../../app/ui/form";
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
  if (usage.isError) return <LoadFailed retry={usage.refetch} />;
  const u = usage.data;
  return (
    <div className="space-y-6">
      <Stage
        set="mustard"
        back={{ to: "/app", label: "Admin" }}
        title="Usage"
        turn="Against the free plan."
        prop="clock"
        className="mb-6"
      />
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
        {/* Figures to read at a glance: the number large, what it counts beside it. */}
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          <Figure value={u.people} label={`people, of whom ${u.teachers} teach`} />
          <Figure value={u.attempts_this_month} label="attempts this month" />
          <Figure
            value={u.attempts_now}
            label={`taking a test now; the free plan manages about ${LIMITS.liveStudents} at once`}
          />
          <div>
            <dt className="text-caption-1-regular text-text-muted">Last activity</dt>
            <dd className="mt-1 text-headline-semibold text-text">
              {u.last_activity ? new Date(u.last_activity).toLocaleString() : "None"}
            </dd>
            <dd className="text-caption-1-regular text-text-muted">
              A free project pauses after a week without any.
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}

function Figure({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className="font-display text-[2.75rem] leading-none font-extrabold tracking-[-0.04em] text-text tabular-nums">
        {value}
      </dd>
      <dd aria-hidden className="text-caption-1-regular text-text-muted">
        {label}
      </dd>
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
          className={`h-full rounded-full ${share > 0.8 ? "bg-tomato" : "bg-cobalt"}`}
          style={{ width: `${share * 100}%` }}
        />
      </div>
      <p className="text-sm">
        {mb(used)} of {mb(limit)} ({Math.round(share * 100)}%){note && ` · ${note}`}
      </p>
    </Card>
  );
}
