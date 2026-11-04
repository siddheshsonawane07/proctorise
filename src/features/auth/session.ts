import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";

export type SessionState = { status: "loading" } | { status: "ready"; session: Session | null };

export const SessionContext = createContext<SessionState>({ status: "loading" });

export function useSession(): SessionState {
  return useContext(SessionContext);
}
