import type { Json } from "../../lib/database.types";

export type SaveState =
  | { kind: "saved" }
  | { kind: "saving" }
  /** The network is down: answers wait on this computer and are sent on reconnect. */
  | { kind: "offline" }
  /** The server refused an answer (time up, already submitted): it will not be retried. */
  | { kind: "refused"; message: string };

type Pending = Record<string, Json>;
/** Sends one answer; resolves with the server's clock (ISO), rejects with the Supabase error. */
export type Send = (itemId: string, response: Json) => Promise<string>;

/** A Postgres error has a five-character SQLSTATE; a failed fetch does not. */
export function isServerRefusal(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string" &&
    /^[0-9A-Z]{5}$/.test(error.code)
  );
}

/**
 * Answers waiting to be saved, newest per question, kept in localStorage so a refresh or a lost
 * connection loses nothing. Sent one at a time, in the order they were changed.
 */
export class SaveQueue {
  private pending: Pending;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private flushing: Promise<void> | null = null;
  private readonly key: string;

  constructor(
    attemptId: string,
    private readonly send: Send,
    private readonly onState: (state: SaveState) => void,
    private readonly onServerTime: (iso: string) => void = () => {},
    private readonly storage: Storage | null = safeLocalStorage(),
    private readonly delayMs = 1000,
  ) {
    this.key = `proctorise.answers.${attemptId}`;
    this.pending = this.load();
  }

  get size(): number {
    return Object.keys(this.pending).length;
  }

  enqueue(itemId: string, response: Json): void {
    // Re-insert so the order is the order of the last change.
    delete this.pending[itemId];
    this.pending[itemId] = response;
    this.persist();
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), this.delayMs);
  }

  /** Sends everything waiting. Safe to call at any time; concurrent calls share one run. */
  flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.flushing ??= this.run().finally(() => (this.flushing = null));
    return this.flushing;
  }

  private async run(): Promise<void> {
    while (this.size > 0) {
      const [itemId, response] = Object.entries(this.pending)[0]!;
      this.onState({ kind: "saving" });
      try {
        this.onServerTime(await this.send(itemId, response));
        // Only drop it if it wasn't changed again while it was being sent.
        if (this.pending[itemId] === response) delete this.pending[itemId];
        this.persist();
      } catch (error) {
        if (isServerRefusal(error)) {
          delete this.pending[itemId];
          this.persist();
          const message =
            error && typeof error === "object" && "message" in error ? String(error.message) : "";
          this.onState({ kind: "refused", message });
          continue;
        }
        this.onState({ kind: "offline" });
        return;
      }
    }
    this.onState({ kind: "saved" });
  }

  private load(): Pending {
    try {
      const raw = this.storage?.getItem(this.key);
      return raw ? (JSON.parse(raw) as Pending) : {};
    } catch {
      return {};
    }
  }

  private persist(): void {
    try {
      if (this.size === 0) this.storage?.removeItem(this.key);
      else this.storage?.setItem(this.key, JSON.stringify(this.pending));
    } catch {
      // Storage full or blocked: the answer is still in memory and still being sent.
    }
  }
}

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
