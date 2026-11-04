import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { SessionContext, type SessionState } from "./session";

/** Mirrors the Supabase client's session for React. The client stays the source. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: "loading" });
  const queryClient = useQueryClient();

  useEffect(() => {
    // Fires once with the stored session (INITIAL_SESSION), then on every change, including a
    // sign-out in another tab.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setState({ status: "ready", session });
      // A different person may sign in next on this browser: drop everything cached for the last.
      if (event === "SIGNED_OUT") queryClient.clear();
      if (event === "SIGNED_IN" || event === "USER_UPDATED") void queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}
