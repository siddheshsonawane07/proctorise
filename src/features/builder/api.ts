import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import type { TablesUpdate } from "../../lib/database.types";
import { unwrap, type TestRow } from "../classes/api";
import type { Option } from "../bank/question";
import type { ViewItem } from "../questions/QuestionView";

export function useTest(testId: string) {
  return useQuery({
    queryKey: ["test", testId],
    queryFn: async (): Promise<TestRow | null> => {
      const { data, error } = await supabase
        .from("tests")
        .select("*")
        .eq("id", testId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export type DraftQuestion = ViewItem & { bankPoints: number; sortOrder: number };

export function useDraftQuestions(testId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["test", testId, "draft"],
    enabled,
    queryFn: async (): Promise<DraftQuestion[]> =>
      unwrap(await supabase.rpc("draft_questions", { p_test_id: testId })).map((q) => ({
        id: q.question_id,
        type: q.type,
        prompt: q.prompt,
        options: q.options as Option[],
        points: Number(q.points),
        bankPoints: Number(q.bank_points),
        sortOrder: q.sort_order,
      })),
  });
}

export function usePublishedItems(testId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["test", testId, "items"],
    enabled,
    queryFn: async (): Promise<ViewItem[]> =>
      unwrap(
        await supabase
          .from("test_items")
          .select("id, type, prompt, options, points")
          .eq("test_id", testId)
          .order("position"),
      ).map((i) => ({ ...i, options: i.options as Option[], points: Number(i.points) })),
  });
}

function useTestMutation<A>(testId: string, fn: (args: A) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["test", testId] });
      await queryClient.invalidateQueries({ queryKey: ["class"] });
    },
  });
}

/** Shows the change at once, and puts it back if the database refuses it. */
export function useUpdateTest(testId: string) {
  const queryClient = useQueryClient();
  const key = ["test", testId];
  return useMutation({
    mutationFn: async (fields: TablesUpdate<"tests">) =>
      unwrap(await supabase.from("tests").update(fields).eq("id", testId)),
    onMutate: async (fields) => {
      await queryClient.cancelQueries({ queryKey: key, exact: true });
      const before = queryClient.getQueryData<TestRow | null>(key);
      if (before) queryClient.setQueryData(key, { ...before, ...fields });
      return { before };
    },
    onError: (_error, _fields, context) => queryClient.setQueryData(key, context?.before),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: key, exact: true });
      await queryClient.invalidateQueries({ queryKey: ["class"] });
    },
  });
}

export function useAddQuestion(testId: string) {
  return useTestMutation(testId, async (args: { questionId: string; position: number }) =>
    unwrap(
      await supabase
        .from("test_questions")
        .insert({ test_id: testId, question_id: args.questionId, position: args.position }),
    ),
  );
}

export function useRemoveQuestion(testId: string) {
  return useTestMutation(testId, async (questionId: string) =>
    unwrap(
      await supabase
        .from("test_questions")
        .delete()
        .eq("test_id", testId)
        .eq("question_id", questionId),
    ),
  );
}

/** Writes the whole order at once, so two rows never share a position. */
export function useReorder(testId: string) {
  return useTestMutation(testId, async (questionIds: string[]) => {
    for (const [position, questionId] of questionIds.entries()) {
      unwrap(
        await supabase
          .from("test_questions")
          .update({ position })
          .eq("test_id", testId)
          .eq("question_id", questionId),
      );
    }
  });
}

export function useSetPoints(testId: string) {
  return useTestMutation(testId, async (args: { questionId: string; points: number | null }) =>
    unwrap(
      await supabase
        .from("test_questions")
        .update({ points: args.points })
        .eq("test_id", testId)
        .eq("question_id", args.questionId),
    ),
  );
}

export function usePublish(testId: string) {
  return useTestMutation(testId, async () =>
    unwrap(await supabase.rpc("publish_test", { p_test_id: testId })),
  );
}

export function useUnpublish(testId: string) {
  return useTestMutation(testId, async () =>
    unwrap(await supabase.rpc("unpublish_test", { p_test_id: testId })),
  );
}
