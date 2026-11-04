import { SaveQueue, type SaveState } from "./saveQueue";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, v),
  };
}

describe("SaveQueue", () => {
  it("sends only the newest answer per question, in the order they changed", async () => {
    const sent: [string, unknown][] = [];
    const states: SaveState["kind"][] = [];
    const queue = new SaveQueue(
      "a1",
      async (item, response) => {
        sent.push([item, response]);
        return "2026-11-04T10:00:00Z";
      },
      (s) => states.push(s.kind),
      () => {},
      memoryStorage(),
      10_000,
    );
    queue.enqueue("q1", "a");
    queue.enqueue("q2", true);
    queue.enqueue("q1", "b");
    await queue.flush();
    expect(sent).toEqual([
      ["q2", true],
      ["q1", "b"],
    ]);
    expect(states.at(-1)).toBe("saved");
  });

  it("keeps answers on this computer while offline, and sends them later", async () => {
    const storage = memoryStorage();
    let online = false;
    const sent: string[] = [];
    const states: SaveState["kind"][] = [];
    const send = async (item: string) => {
      if (!online) throw new TypeError("Failed to fetch");
      sent.push(item);
      return "2026-11-04T10:00:00Z";
    };
    const queue = new SaveQueue(
      "a1",
      send,
      (s) => states.push(s.kind),
      () => {},
      storage,
      10_000,
    );
    queue.enqueue("q1", "a");
    await queue.flush();
    expect(states.at(-1)).toBe("offline");
    expect(storage.getItem("proctorise.answers.a1")).toContain("q1");

    // A reload: a new queue on the same storage picks the answer up.
    online = true;
    const after = new SaveQueue(
      "a1",
      send,
      (s) => states.push(s.kind),
      () => {},
      storage,
      10_000,
    );
    expect(after.size).toBe(1);
    await after.flush();
    expect(sent).toEqual(["q1"]);
    expect(storage.getItem("proctorise.answers.a1")).toBeNull();
  });

  it("drops an answer the server refuses, and says why", async () => {
    const states: SaveState[] = [];
    const queue = new SaveQueue(
      "a1",
      async () => {
        throw { code: "P0001", message: "Time is up for this attempt" };
      },
      (s) => states.push(s),
      () => {},
      memoryStorage(),
      10_000,
    );
    queue.enqueue("q1", "a");
    await queue.flush();
    expect(states).toContainEqual({ kind: "refused", message: "Time is up for this attempt" });
    expect(queue.size).toBe(0);
  });

  it("reports the server's clock after each save", async () => {
    const times: string[] = [];
    const queue = new SaveQueue(
      "a1",
      async () => "2026-11-04T10:00:05Z",
      () => {},
      (t) => times.push(t),
      memoryStorage(),
      10_000,
    );
    queue.enqueue("q1", 1);
    await queue.flush();
    expect(times).toEqual(["2026-11-04T10:00:05Z"]);
  });
});
