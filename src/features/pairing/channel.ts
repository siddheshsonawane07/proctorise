import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/database.types";

/** What travels on a pairing's private channel. */
export type PairingMessage =
  | { event: "preview"; image: string } // a small JPEG data URL, during setup only
  | { event: "ready" };

/**
 * The private Realtime channel one laptop and its one phone share (authorised by
 * can_use_pairing_channel in the database). Presence says who is there: "laptop" and "phone".
 */
export function pairingChannel(
  client: SupabaseClient<Database>,
  pairingId: string,
  me: "laptop" | "phone",
  handlers: {
    onMessage?: (message: PairingMessage) => void;
    onPresence?: (phonePresent: boolean) => void;
  },
): RealtimeChannel {
  const channel = client.channel(`pairing:${pairingId}`, {
    config: { private: true, broadcast: { self: false }, presence: { key: me } },
  });
  channel
    .on("broadcast", { event: "preview" }, ({ payload }) =>
      handlers.onMessage?.({ event: "preview", image: String(payload.image) }),
    )
    .on("broadcast", { event: "ready" }, () => handlers.onMessage?.({ event: "ready" }))
    .on("presence", { event: "sync" }, () =>
      handlers.onPresence?.("phone" in channel.presenceState()),
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") void channel.track({ device: me, at: Date.now() });
    });
  return channel;
}

export function send(channel: RealtimeChannel, message: PairingMessage): void {
  const { event, ...payload } = message;
  void channel.send({ type: "broadcast", event, payload });
}
