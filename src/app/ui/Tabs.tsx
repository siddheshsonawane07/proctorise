import type { ReactNode } from "react";

export type TabList<T extends string> = readonly { id: T; label: string }[];

export function Tabs<T extends string>({
  label,
  tabs,
  tab,
  onChange,
}: {
  label: string;
  tabs: TabList<T>;
  tab: T;
  onChange: (id: T) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex gap-1 overflow-x-auto border-b border-border"
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          type="button"
          aria-selected={tab === t.id}
          onClick={() => onChange(t.id)}
          className={`-mb-px border-b-2 px-4 py-2.5 text-body-medium whitespace-nowrap ${
            tab === t.id
              ? "border-accent text-accent"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/**
 * One tab's content. It stays on the page while another tab is open, only hidden, so a form
 * half filled in is still there on coming back.
 */
export function TabPanel({
  label,
  show,
  children,
}: {
  label: string;
  show: boolean;
  children: ReactNode;
}) {
  return (
    // The tabs' own underline is the first section's rule; a second one would double it.
    <div
      role="tabpanel"
      aria-label={label}
      hidden={!show}
      className="space-y-8 pt-2 [&>section:first-child]:border-t-0 [&>section:first-child]:pt-0"
    >
      {children}
    </div>
  );
}
