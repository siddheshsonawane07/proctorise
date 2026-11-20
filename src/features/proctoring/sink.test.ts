import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/database.types";
import { EventSink } from "./sink";

type Row = { client_id: string };

/** A client whose inserts wait until released, to catch stop() during a send. */
function slowClient() {
  const stored: string[] = [];
  const waiting: (() => void)[] = [];
  const client = {
    from: () => ({
      upsert: (batch: Row[]) =>
        new Promise<{ error: null }>((resolve) =>
          waiting.push(() => {
            stored.push(...batch.map((r) => r.client_id));
            resolve({ error: null });
          }),
        ),
    }),
    rpc: async () => ({ error: null }),
  } as unknown as SupabaseClient<Database>;
  return { client, stored, release: () => waiting.splice(0).forEach((go) => go()) };
}

function row(client_id: string) {
  return {
    client_id,
    attempt_id: "a",
    device: "laptop" as const,
    kind: "left_test",
    severity: "warn" as const,
    started_at: new Date(0).toISOString(),
  };
}

describe("EventSink", () => {
  it("sends an event added during a send when it stops", async () => {
    const { client, stored, release } = slowClient();
    const sink = new EventSink(60_000, client);
    sink.add(row("first"));
    const sending = sink.flush();
    sink.add(row("last"));
    const stopped = sink.stop();
    release();
    await sending;
    await vi.waitFor(() => {
      release();
      expect(stored).toEqual(["first", "last"]);
    });
    await stopped;
  });
});
