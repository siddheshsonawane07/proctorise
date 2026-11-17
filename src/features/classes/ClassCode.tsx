import { RiFileCopyLine } from "@remixicon/react";
import { toast } from "../../app/ui/toast";

/** The code students join with, and a button that copies it. */
export function ClassCode({ code }: { code: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      toast.ok("Class code copied.");
    } catch {
      toast.error("Couldn't copy. Select the code and copy it yourself.");
    }
  }
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-text-muted">Class code</span>
      <strong className="font-mono font-semibold tracking-wider">{code}</strong>
      <button
        type="button"
        onClick={copy}
        className="grid size-7 place-items-center rounded-md text-text-muted hover:bg-surface-muted hover:text-text"
      >
        <RiFileCopyLine aria-hidden className="size-4" />
        <span className="sr-only">Copy the class code</span>
      </button>
    </span>
  );
}
