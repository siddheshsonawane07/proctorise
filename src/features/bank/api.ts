import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import type { Json } from "../../lib/database.types";
import { unwrap } from "../classes/api";
import type { Option, QuestionInput } from "./question";

export type BankQuestion = {
  id: string;
  type: QuestionInput["type"];
  prompt: string;
  options: Option[];
  points: number;
  tags: string[];
  key: { correct: Json; tolerance: number; case_sensitive: boolean } | null;
};

export function useBank() {
  return useQuery({
    queryKey: ["bank"],
    queryFn: async (): Promise<BankQuestion[]> => {
      const rows = unwrap(
        await supabase
          .from("questions")
          .select(
            "id, type, prompt, options, points, tags, question_keys(correct, tolerance, case_sensitive)",
          )
          .order("updated_at", { ascending: false }),
      );
      return rows.map(({ question_keys, options, ...q }) => ({
        ...q,
        options: options as Option[],
        key: question_keys,
      }));
    },
  });
}

export function useSaveQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string | null; input: QuestionInput }) =>
      unwrap(
        await supabase.rpc("save_question", {
          // A new question has no id yet; the function creates one.
          p_id: id as string,
          p_type: input.type,
          p_prompt: input.prompt,
          p_options: input.options,
          p_points: input.points,
          p_tags: input.tags,
          p_correct: input.correct,
          p_tolerance: input.tolerance,
          p_case_sensitive: input.caseSensitive,
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bank"] }),
  });
}
