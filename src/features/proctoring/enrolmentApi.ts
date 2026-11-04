import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useSession } from "../auth/session";
import { unwrap } from "../classes/api";

/** The signed-in student's reference photo record, or null if they have none. */
export function useEnrolment() {
  const state = useSession();
  const userId = state.status === "ready" ? state.session?.user.id : undefined;
  return useQuery({
    queryKey: ["enrolment", userId],
    enabled: !!userId,
    queryFn: async () =>
      unwrap(
        await supabase
          .from("identity_enrolments")
          .select("updated_at, liveness_passed_at")
          .eq("student_id", userId!)
          .maybeSingle(),
      ),
  });
}
