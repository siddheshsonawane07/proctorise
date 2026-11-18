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
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto pb-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          type="button"
          aria-selected={tab === t.id}
          onClick={() => onChange(t.id)}
          className={`rounded-full px-4 py-1.5 text-body-medium whitespace-nowrap ${
            tab === t.id
              ? "bg-ink text-[#fbf8f2] dark:bg-[#efe9de] dark:text-ink"
              : "text-text-muted hover:bg-surface-muted hover:text-text"
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
    // The first section sits right under the pills; its rule would only separate it from them.
    <div
      role="tabpanel"
      aria-label={label}
      hidden={!show}
      className="space-y-10 pt-6 [&>section:first-child]:border-t-0 [&>section:first-child]:pt-0"
    >
      {children}
    </div>
  );
}
