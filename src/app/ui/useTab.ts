import { useSearchParams } from "react-router";
import type { TabList } from "./Tabs";

/** Which tab is open, kept in the address (`?tab=`), so Back and a shared link land on it. */
export function useTab<T extends string>(tabs: TabList<T>): [T, (id: T) => void] {
  const [params, setParams] = useSearchParams();
  const first = tabs[0]!.id;
  const tab = tabs.find((t) => t.id === params.get("tab"))?.id ?? first;
  return [tab, (id) => setParams(id === first ? {} : { tab: id }, { replace: true })];
}
