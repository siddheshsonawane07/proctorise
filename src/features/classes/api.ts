import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import type { Database, Tables } from "../../lib/database.types";
import { useSession } from "../auth/session";

export type ClassRow = Tables<"classes">;
export type TestRow = Tables<"tests">;
export type MemberStatus = Database["public"]["Enums"]["member_status"];

function useUserId(): string | undefined {
  const state = useSession();
  return state.status === "ready" ? state.session?.user.id : undefined;
}

/** The rows of a query that succeeded; a failed one throws, for TanStack Query to show. */
export function unwrap<T>(result: { data: T | null; error: unknown }): T {
  if (result.error) throw result.error;
  return result.data as T;
}

export function useTeachingClasses(enabled: boolean) {
  const userId = useUserId();
  return useQuery({
    queryKey: ["classes", "teaching", userId],
    enabled: enabled && !!userId,
    queryFn: async () =>
      unwrap(
        await supabase
          .from("class_teachers")
          .select("kind, classes(*)")
          .eq("teacher_id", userId!)
          .order("added_at", { ascending: false }),
      ).flatMap((row) => (row.classes ? [{ ...row.classes, kind: row.kind }] : [])),
  });
}

export function useJoinedClasses() {
  const userId = useUserId();
  return useQuery({
    queryKey: ["classes", "joined", userId],
    enabled: !!userId,
    queryFn: async () =>
      unwrap(
        await supabase
          .from("class_members")
          .select("time_multiplier, classes(id, name)")
          .eq("student_id", userId!)
          .eq("status", "active")
          .order("joined_at", { ascending: false }),
      ).flatMap((row) => (row.classes ? [row.classes] : [])),
  });
}

export function useClass(classId: string) {
  return useQuery({
    queryKey: ["class", classId],
    // null when the class doesn't exist or this person may not see it (RLS shows them nothing).
    queryFn: async (): Promise<ClassRow | null> => {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("id", classId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useClassTests(classId: string) {
  return useQuery({
    queryKey: ["class", classId, "tests"],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("tests")
          .select("*")
          .eq("class_id", classId)
          .order("opens_at", { ascending: true }),
      ),
  });
}

export function useRoster(classId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["class", classId, "roster"],
    enabled,
    queryFn: async () => unwrap(await supabase.rpc("class_roster", { p_class_id: classId })),
  });
}

export function useClassTeachers(classId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["class", classId, "teachers"],
    enabled,
    queryFn: async () => unwrap(await supabase.rpc("class_teacher_list", { p_class_id: classId })),
  });
}

/** A mutation that refreshes one class (or every class list) when it succeeds. */
function useClassMutation<A, R>(classId: string | null, fn: (args: A) => Promise<R>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: classId ? ["class", classId] : ["classes"] }),
  });
}

export function useCreateClass() {
  return useClassMutation(null, async (name: string) =>
    unwrap(await supabase.rpc("create_class", { p_name: name })),
  );
}

export type JoinResult =
  | { joined: true; class_id: string; name: string }
  | {
      joined: false;
      reason: "no_match" | "too_many" | "removed";
    };

export function useJoinClass() {
  return useClassMutation(
    null,
    async (code: string) =>
      unwrap(await supabase.rpc("join_class", { p_code: code })) as JoinResult,
  );
}

export function useUpdateClass(classId: string) {
  return useClassMutation(
    classId,
    async (fields: Partial<Pick<ClassRow, "name" | "join_open" | "archived_at">>) =>
      unwrap(await supabase.from("classes").update(fields).eq("id", classId)),
  );
}

export function useRotateCode(classId: string) {
  return useClassMutation(classId, async () =>
    unwrap(await supabase.rpc("rotate_join_code", { p_class_id: classId })),
  );
}

export function useSetMember(classId: string) {
  return useClassMutation(
    classId,
    async (args: { studentId: string; status: MemberStatus; timeMultiplier: number }) =>
      unwrap(
        await supabase.rpc("set_member", {
          p_class_id: classId,
          p_student_id: args.studentId,
          p_status: args.status,
          p_time_multiplier: args.timeMultiplier,
        }),
      ),
  );
}

export function useAddCoTeacher(classId: string) {
  return useClassMutation(classId, async (email: string) =>
    unwrap(await supabase.rpc("add_co_teacher", { p_class_id: classId, p_email: email })),
  );
}

export function useRemoveCoTeacher(classId: string) {
  return useClassMutation(classId, async (teacherId: string) =>
    unwrap(
      await supabase.rpc("remove_co_teacher", { p_class_id: classId, p_teacher_id: teacherId }),
    ),
  );
}

export function useCreateTest(classId: string) {
  return useClassMutation(classId, async (): Promise<{ id: string }> => {
    const { data, error } = await supabase
      .from("tests")
      .insert({ class_id: classId, title: "Untitled test" })
      .select("id")
      .single();
    if (error) throw error;
    return data;
  });
}
