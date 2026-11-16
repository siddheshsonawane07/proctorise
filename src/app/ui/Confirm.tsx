import { useId, useState, type ReactNode } from "react";
import { Button } from "./form";

/**
 * A button that asks before it acts. With `phrase`, the person types it first: for what can't be
 * undone.
 */
export function Confirm({
  label,
  question,
  yes,
  phrase,
  busy = false,
  disabled = false,
  onConfirm,
}: {
  label: string;
  question: ReactNode;
  yes: string;
  phrase?: string;
  busy?: boolean;
  disabled?: boolean;
  onConfirm: () => void;
}) {
  const [asking, setAsking] = useState(false);
  const [typed, setTyped] = useState("");
  const id = useId();

  if (!asking) {
    return (
      <Button variant="plain" disabled={disabled} onClick={() => setAsking(true)}>
        {label}
      </Button>
    );
  }
  return (
    <div
      role="group"
      aria-label={label}
      className="w-full space-y-3 rounded-xl border border-high/40 bg-high/5 p-3"
    >
      <p className="text-body-regular text-text">{question}</p>
      {phrase !== undefined && (
        <label htmlFor={id} className="block text-body-regular text-text">
          Type <strong>{phrase}</strong> to confirm
          <input
            id={id}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            className="mt-1.5 block w-full rounded-2lg bg-surface px-3 py-2 ring-1 ring-border ring-inset focus:ring-2 focus:ring-high focus:outline-none"
          />
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="danger"
          disabled={busy || (phrase !== undefined && typed.trim() !== phrase.trim())}
          onClick={onConfirm}
        >
          {yes}
        </Button>
        <Button
          variant="plain"
          onClick={() => {
            setAsking(false);
            setTyped("");
          }}
        >
          No, go back
        </Button>
      </div>
    </div>
  );
}
