import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import type { Tables } from "../../lib/database.types";
import { useSession } from "./session";

export type Profile = Tables<"profiles">;

export function useProfile() {
  const state = useSession();
  const userId = state.status === "ready" ? state.session?.user.id : undefined;
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}
