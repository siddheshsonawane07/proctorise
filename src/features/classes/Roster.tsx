import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  RiCloseLine,
  RiDownload2Line,
  RiFlagLine,
  RiSearchLine,
  RiUserLine,
} from "@remixicon/react";
import { Button, Loading, Message } from "../../app/ui/form";
import { messageFrom } from "../../lib/errors";
import { downloadCsv } from "../../lib/csv";
import { formatWhen } from "../../lib/time";
import { cx } from "@/utils/cx";
import {
  fetchClassMarks,
  useClassTests,
  useRoster,
  useSetMembers,
  useStudentReport,
  type MemberStatus,
} from "./api";

const MULTIPLIERS = [1, 1.25, 1.5, 2];
const timeLabel = (m: number) => (m === 1 ? "None" : `${m}× time`);

type Filter = "all" | MemberStatus;

export function Roster({ classId }: { classId: string }) {
  const roster = useRoster(classId, true);
  const tests = useClassTests(classId);
  const setMembers = useSetMembers(classId);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("active");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [bulkTime, setBulkTime] = useState(1.5);
  const [open, setOpen] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (roster.data ?? []).filter(
      (r) =>
        (filter === "all" || r.status === filter) &&
        (!q || r.full_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)),
    );
  }, [roster.data, query, filter]);

  if (roster.isPending) return <Loading />;
  if (roster.isError) return <Message kind="error">{messageFrom(roster.error)}</Message>;
  if (roster.data.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center">
        <RiUserLine aria-hidden className="mx-auto size-8 text-text-muted" />
        <p className="mt-2 text-body-medium text-text">No students yet</p>
        <p className="text-body-regular text-text-muted">Share the join code with your class.</p>
      </div>
    );
  }

  const counts = {
    all: roster.data.length,
    active: roster.data.filter((r) => r.status === "active").length,
    removed: roster.data.filter((r) => r.status === "removed").length,
  };
  const pickedShown = shown.filter((r) => picked.has(r.student_id));
  const allPicked = shown.length > 0 && pickedShown.length === shown.length;

  function toggle(id: string) {
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function bulk(status: MemberStatus | null, timeMultiplier: number | null) {
    setMembers.mutate(
      { studentIds: pickedShown.map((r) => r.student_id), status, timeMultiplier },
      { onSuccess: () => setPicked(new Set()) },
    );
  }

  async function exportAll() {
    setExporting(null);
    try {
      const marks = await fetchClassMarks(classId);
      const published = (tests.data ?? []).filter((t) => t.status !== "draft");
      const header = ["Name", "Email", "Status", "Extra time", "Joined"];
      for (const t of published) header.push(t.title);
      const rows: (string | number | null)[][] = [header];
      for (const r of roster.data ?? []) {
        const row: (string | number | null)[] = [
          r.full_name,
          r.email,
          r.status === "active" ? "In the class" : "Removed",
          timeLabel(Number(r.time_multiplier)),
          r.joined_at.slice(0, 10),
        ];
        for (const t of published) {
          const m = marks.find((x) => x.student_id === r.student_id && x.test_id === t.id);
          row.push(
            !m
              ? ""
              : m.score === null
                ? "Not marked"
                : `${Number(m.score)} / ${Number(m.max_score)}`,
          );
        }
        rows.push(row);
      }
      downloadCsv("students-and-marks.csv", rows);
    } catch (error) {
      setExporting(messageFrom(error));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-56 flex-1">
          <span className="sr-only">Search students</span>
          <RiSearchLine
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email"
            className="block w-full rounded-2lg bg-background-tertiary-default py-2 pr-3 pl-9 text-body-regular text-text-primary ring-2 ring-transparent ring-inset hover:ring-border-button-hover focus:ring-border-button-active focus:outline-none"
          />
        </label>
        <div className="flex rounded-xl bg-surface-muted p-1" role="group" aria-label="Show">
          {(["active", "removed", "all"] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cx(
                "rounded-lg px-3 py-1.5 text-body-medium",
                filter === f ? "bg-surface text-text shadow-xs" : "text-text-muted hover:text-text",
              )}
            >
              {f === "active" ? "In the class" : f === "removed" ? "Removed" : "Everyone"}{" "}
              <span className="text-text-muted">{counts[f]}</span>
            </button>
          ))}
        </div>
        <Button variant="plain" onClick={exportAll}>
          <span className="inline-flex items-center gap-1.5">
            <RiDownload2Line aria-hidden className="size-4" />
            Download students and marks
          </span>
        </Button>
      </div>

      {exporting && <Message kind="error">{exporting}</Message>}
      {setMembers.isError && <Message kind="error">{messageFrom(setMembers.error)}</Message>}

      {pickedShown.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-2.5">
          <span className="text-body-medium text-text">{pickedShown.length} selected</span>
          <label className="flex items-center gap-2 text-body-regular">
            Extra time
            <select
              value={bulkTime}
              onChange={(e) => setBulkTime(Number(e.target.value))}
              className="rounded-lg bg-surface px-2 py-1 ring-1 ring-border"
            >
              {MULTIPLIERS.map((m) => (
                <option key={m} value={m}>
                  {timeLabel(m)}
                </option>
              ))}
            </select>
          </label>
          <Button
            variant="plain"
            disabled={setMembers.isPending}
            onClick={() => bulk(null, bulkTime)}
          >
            Set extra time
          </Button>
          {filter !== "removed" && (
            <Button
              variant="plain"
              disabled={setMembers.isPending}
              onClick={() => bulk("removed", null)}
            >
              Remove from class
            </Button>
          )}
          {filter !== "active" && (
            <Button
              variant="plain"
              disabled={setMembers.isPending}
              onClick={() => bulk("active", null)}
            >
              Add back
            </Button>
          )}
          <button
            type="button"
            onClick={() => setPicked(new Set())}
            className="ml-auto text-body-medium text-text-muted hover:text-text"
          >
            Clear
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-left text-body-regular">
          <thead className="bg-surface-muted text-caption-1-semibold text-text-muted">
            <tr>
              <th className="w-10 px-4 py-2.5">
                <input
                  type="checkbox"
                  aria-label="Select everyone shown"
                  checked={allPicked}
                  onChange={() =>
                    setPicked(allPicked ? new Set() : new Set(shown.map((r) => r.student_id)))
                  }
                />
              </th>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Email</th>
              <th className="px-4 py-2.5">Extra time</th>
              <th className="px-4 py-2.5">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shown.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-text-muted">
                  No one matches.
                </td>
              </tr>
            )}
            {shown.map((r) => (
              <tr
                key={r.student_id}
                className={cx(
                  picked.has(r.student_id) && "bg-accent/5",
                  r.status === "removed" && "text-text-muted",
                )}
              >
                <td className="px-4 py-2.5">
                  <input
                    type="checkbox"
                    aria-label={`Select ${r.full_name || r.email}`}
                    checked={picked.has(r.student_id)}
                    onChange={() => toggle(r.student_id)}
                  />
                </td>
                <td className="px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => setOpen(r.student_id)}
                    className="text-body-medium text-accent hover:underline"
                  >
                    {r.full_name || "No name"}
                  </button>
                  {r.status === "removed" && (
                    <span className="ml-2 rounded-md bg-surface-muted px-1.5 py-0.5 text-caption-1-medium">
                      Removed
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5">{r.email}</td>
                <td className="px-4 py-2.5">{timeLabel(Number(r.time_multiplier))}</td>
                <td className="px-4 py-2.5">{formatWhen(r.joined_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <StudentPanel
          classId={classId}
          studentId={open}
          name={roster.data.find((r) => r.student_id === open)?.full_name ?? ""}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

const ATTEMPT_LABEL: Record<string, string> = {
  in_progress: "Writing now",
  submitted: "Handed in",
  auto_submitted: "Handed in when time ran out",
  terminated: "Ended by the teacher",
  voided: "Voided",
};

function StudentPanel({
  classId,
  studentId,
  name,
  onClose,
}: {
  classId: string;
  studentId: string;
  name: string;
  onClose: () => void;
}) {
  const report = useStudentReport(classId, studentId);
  const rows = report.data ?? [];
  const marked = rows.filter((r) => r.attempt_id && r.score !== null && Number(r.max_score) > 0);
  const average = marked.length
    ? Math.round(
        (marked.reduce((a, r) => a + Number(r.score) / Number(r.max_score), 0) / marked.length) *
          100,
      )
    : null;
  const flags = rows.reduce((a, r) => a + Number(r.high_flags ?? 0), 0);

  return (
    <section
      aria-label={`${name || "Student"}'s record`}
      className="rounded-2xl border border-border bg-surface p-5 shadow-xs"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-title-3-semibold text-text">{name || "Student"}</h2>
          <p className="text-body-regular text-text-muted">Every published test in this class.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid size-8 place-items-center rounded-lg hover:bg-surface-muted"
        >
          <RiCloseLine aria-hidden className="size-5" />
          <span className="sr-only">Close the record</span>
        </button>
      </div>
      {report.isPending && <Loading />}
      {report.isError && <Message kind="error">{messageFrom(report.error)}</Message>}
      {report.data && (
        <>
          <dl className="mt-4 grid grid-cols-3 gap-3">
            {[
              ["Tests taken", `${rows.filter((r) => r.attempt_id).length} of ${rows.length}`],
              ["Average mark", average === null ? "—" : `${average}%`],
              ["High flags", String(flags)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-surface-muted p-3">
                <dt className="text-caption-1-medium text-text-muted">{k}</dt>
                <dd className="mt-0.5 text-title-3-semibold text-text">{v}</dd>
              </div>
            ))}
          </dl>
          <ul className="mt-4 divide-y divide-border">
            {rows.length === 0 && <li className="py-3 text-text-muted">No published tests yet.</li>}
            {rows.map((r) => (
              <li
                key={r.test_id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <div>
                  <p className="text-body-medium text-text">{r.title}</p>
                  <p className="text-caption-1-regular text-text-muted">
                    {r.attempt_id
                      ? `${ATTEMPT_LABEL[r.attempt_status] ?? r.attempt_status}${
                          r.submitted_at ? ` · ${formatWhen(r.submitted_at)}` : ""
                        }`
                      : `Not taken · closes ${formatWhen(r.closes_at)}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {Number(r.high_flags) > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-high/10 px-1.5 py-0.5 text-caption-1-semibold text-high">
                      <RiFlagLine aria-hidden className="size-3.5" />
                      {Number(r.high_flags)} high
                    </span>
                  )}
                  {r.attempt_id && (
                    <span className="text-body-semibold text-text">
                      {r.score === null
                        ? "Not marked"
                        : `${Number(r.score)} / ${Number(r.max_score)}`}
                    </span>
                  )}
                  {r.attempt_id && (
                    <Link
                      to={`/app/attempts/${r.attempt_id}/report`}
                      className="text-body-medium text-accent"
                    >
                      Report
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
