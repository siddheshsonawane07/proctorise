import { Confirm } from "../../app/ui/Confirm";
import type { TestRow } from "./api";

/** Asks first, and says what goes with the test. The database refuses while someone is taking it. */
export function DeleteTest({
  test,
  busy,
  onConfirm,
}: {
  test: TestRow;
  busy: boolean;
  onConfirm: () => void;
}) {
  return (
    <Confirm
      label="Delete"
      question={
        test.status === "draft"
          ? `Delete the draft “${test.title}”? Its questions stay in your bank.`
          : `Delete “${test.title}”? Every student's answers, results and pictures for it are deleted for good. Its questions stay in your bank.`
      }
      yes="Yes, delete it"
      busy={busy}
      onConfirm={onConfirm}
    />
  );
}
