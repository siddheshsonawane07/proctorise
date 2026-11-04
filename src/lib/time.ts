/** `<input type="datetime-local">` speaks local time without a zone; the database speaks UTC. */
export function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export function fromLocalInput(value: string): string {
  return new Date(value).toISOString();
}

const formatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export function formatWhen(iso: string): string {
  return formatter.format(new Date(iso));
}

export type Window = "upcoming" | "open" | "closed";

export function testWindow(opensAt: string, closesAt: string, now = Date.now()): Window {
  if (now < Date.parse(opensAt)) return "upcoming";
  if (now < Date.parse(closesAt)) return "open";
  return "closed";
}
