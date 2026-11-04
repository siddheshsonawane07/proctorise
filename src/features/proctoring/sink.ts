import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import type { Database, TablesInsert } from "../../lib/database.types";
import type { Severity } from "./rules/engine";

type Row = TablesInsert<"proctor_events">;
type Update = { client_id: string; ended_at?: string; severity?: Severity; snapshot_path?: string };

/**
 * Sends events in batches every few seconds, and keeps them while offline. Rows carry a
 * browser-made client_id, so sending a batch twice stores it once.
 */
export class EventSink {
  private rows: Row[] = [];
  private updates: Update[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private sending = false;

  constructor(
    private readonly intervalMs = 5_000,
    private readonly client: SupabaseClient<Database> = supabase,
  ) {}

  start() {
    this.timer ??= setInterval(() => void this.flush(), this.intervalMs);
  }

  add(row: Row) {
    this.rows.push(row);
  }

  update(update: Update) {
    // An update for a row not yet sent is folded into it.
    const row = this.rows.find((r) => r.client_id === update.client_id);
    if (row) {
      if (update.ended_at) row.ended_at = update.ended_at;
      if (update.severity) row.severity = update.severity;
      if (update.snapshot_path) row.snapshot_path = update.snapshot_path;
      return;
    }
    this.updates.push(update);
  }

  async flush(): Promise<void> {
    if (this.sending) return;
    this.sending = true;
    try {
      if (this.rows.length) {
        const batch = this.rows.slice(0, 50);
        const { error } = await this.client
          .from("proctor_events")
          .upsert(batch, { onConflict: "client_id", ignoreDuplicates: true });
        if (!error) this.rows = this.rows.slice(batch.length);
      }
      // Updates only once every row they could refer to is stored.
      if (this.updates.length && this.rows.length === 0) {
        const batch = this.updates.slice(0, 100);
        const { error } = await this.client.rpc("update_proctor_events", { p_updates: batch });
        if (!error) this.updates = this.updates.slice(batch.length);
      }
    } finally {
      this.sending = false;
    }
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    await this.flush();
  }
}
