// The daily job (PHASE_8 § 8.1, 8.4). No imports, so the Edge Function (Deno) and
// scripts/maintenance.mjs (Node, for local runs and the e2e test) share one copy:
// 1. deletes snapshots past their test's retention, through the Storage API (deleting rows in
//    storage.objects would leave the files behind, Phase-8-Critic #2), then forgets them;
// 2. deletes accounts whose owners asked, with their photo and snapshots;
// 3. by running at all, keeps a free Supabase project from pausing after a week idle.

type Result<T> = { data: T | null; error: unknown };

/** The parts of a supabase-js client made with the service key that the job uses. */
export type AdminClient = {
  rpc(fn: string, args?: Record<string, unknown>): PromiseLike<Result<any>>;
  storage: { from(bucket: string): { remove(paths: string[]): PromiseLike<Result<unknown>> } };
  auth: { admin: { deleteUser(id: string): PromiseLike<Result<unknown>> } };
  from(table: string): {
    select(
      columns: string,
      options: { count: "exact"; head: true },
    ): PromiseLike<{ count: number | null; error: unknown }>;
  };
};

export type Report = { purged_snapshots: number; deleted_accounts: number; profiles: number };

function must<T>({ data, error }: Result<T>): T {
  if (error) throw error;
  return data as T;
}

export async function runMaintenance(admin: AdminClient): Promise<Report> {
  const report: Report = { purged_snapshots: 0, deleted_accounts: 0, profiles: 0 };

  // 1. Retention.
  for (;;) {
    const rows: { path: string }[] = must(await admin.rpc("expired_evidence", { p_limit: 500 }));
    if (!rows.length) break;
    const paths = rows.map((r) => r.path);
    must(await admin.storage.from("evidence").remove(paths));
    report.purged_snapshots += must<number>(await admin.rpc("forget_evidence", { p_paths: paths }));
  }

  // 2. Accounts asked to be deleted.
  const accounts: { user_id: string; files: { enrolment: string[]; evidence: string[] } }[] = must(
    await admin.rpc("accounts_to_delete"),
  );
  for (const { user_id, files } of accounts) {
    if (files.enrolment.length) must(await admin.storage.from("enrolment").remove(files.enrolment));
    if (files.evidence.length) {
      must(await admin.storage.from("evidence").remove(files.evidence));
      must(await admin.rpc("forget_evidence", { p_paths: files.evidence }));
    }
    must(await admin.auth.admin.deleteUser(user_id));
    report.deleted_accounts++;
  }

  // 3. One cheap query: activity for the free plan's idle pause.
  const { count, error } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  report.profiles = count ?? 0;
  return report;
}
