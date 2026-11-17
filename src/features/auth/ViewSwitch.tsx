import { useNavigate } from "react-router";
import { cx } from "@/utils/cx";
import { setView, useView, type View } from "./view";
import { useProfile } from "./useProfile";
import { isTeacher } from "./roles";

const LABEL: Record<View, string> = { teacher: "Teacher", student: "Student" };

/** For a teacher only: use the app as a teacher, or as a student in someone else's class. */
export function ViewSwitch({ className }: { className?: string }) {
  const { data: profile } = useProfile();
  const view = useView(profile);
  const navigate = useNavigate();
  if (!isTeacher(profile)) return null;
  return (
    <div
      role="group"
      aria-label="Use Proctorise as"
      className={cx(
        "flex rounded-lg border border-border-button-default bg-surface p-0.5",
        className,
      )}
    >
      {(["teacher", "student"] as const).map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={view === v}
          onClick={() => {
            setView(v);
            navigate("/app");
          }}
          className={cx(
            "flex-1 rounded-md px-3 py-1 text-body-medium",
            view === v ? "bg-text text-surface" : "text-text-muted hover:text-text",
          )}
        >
          {LABEL[v]}
        </button>
      ))}
    </div>
  );
}
