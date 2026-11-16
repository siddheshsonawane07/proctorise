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

/** What a class card says about a test, without opening the class. */
export type CardTest = Pick<
  TestRow,
  "id" | "title" | "status" | "opens_at" | "closes_at" | "duration_min" | "max_attempts"
>;
const CARD_TEST = "id, title, status, opens_at, closes_at, duration_min, max_attempts";

export function useTeachingClasses(enabled: boolean) {
  const userId = useUserId();
  return useQuery({
    queryKey: ["classes", "teaching", userId],
    enabled: enabled && !!userId,
    queryFn: async () =>
      unwrap(
        await supabase
          .from("class_teachers")
          .select(`kind, classes(*, tests(${CARD_TEST}), class_members(status))`)
          .eq("teacher_id", userId!)
          .order("added_at", { ascending: false }),
      ).flatMap((row) => {
        if (!row.classes) return [];
        const { class_members, ...cls } = row.classes;
        return [
          {
            ...cls,
            kind: row.kind,
            students: class_members.filter((m) => m.status === "active").length,
          },
        ];
      }),
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
          .select(`classes(id, name, description, tests(${CARD_TEST}))`)
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

/**
 * A mutation that refreshes one class (or every class list) when it succeeds. `ok` is what the
 * corner notification says then; without it, the caller says it or nothing needs saying.
 */
function useClassMutation<A, R>(classId: string | null, fn: (args: A) => Promise<R>, ok?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    meta: ok ? { ok } : {},
    mutationFn: fn,
    // The lists too: the menu and the cards show a class's name, students and tests.
    onSuccess: async () => {
      if (classId) await queryClient.invalidateQueries({ queryKey: ["class", classId] });
      await queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
  });
}

export function useCreateClass() {
  return useClassMutation(
    null,
    async (args: { name: string; description: string }) => {
      const id = unwrap(await supabase.rpc("create_class", { p_name: args.name }));
      if (args.description) {
        unwrap(
          await supabase.from("classes").update({ description: args.description }).eq("id", id),
        );
      }
      return id;
    },
    "Class created.",
  );
}

export type JoinResult =
  | { joined: true; class_id: string; name: string }
  | {
      joined: false;
      reason: "no_match" | "too_many" | "removed" | "teacher";
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
    async (fields: Partial<Pick<ClassRow, "name" | "description" | "join_open" | "archived_at">>) =>
      unwrap(await supabase.from("classes").update(fields).eq("id", classId)),
  );
}

export function useRotateCode(classId: string) {
  return useClassMutation(
    classId,
    async () => unwrap(await supabase.rpc("rotate_join_code", { p_class_id: classId })),
    "New class code made. The old one no longer works.",
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
    "Saved.",
  );
}

export function useAddCoTeacher(classId: string) {
  return useClassMutation(
    classId,
    async (email: string) =>
      unwrap(await supabase.rpc("add_co_teacher", { p_class_id: classId, p_email: email })),
    "Co-teacher added.",
  );
}

export function useRemoveCoTeacher(classId: string) {
  return useClassMutation(
    classId,
    async (teacherId: string) =>
      unwrap(
        await supabase.rpc("remove_co_teacher", { p_class_id: classId, p_teacher_id: teacherId }),
      ),
    "Co-teacher removed.",
  );
}

/**
 * Leaving, handing over and deleting change what every list shows, and are rare: they refresh
 * everything rather than name each list. The refresh is not waited for: the page that asked is
 * about to lose its class, and would unmount before it could move the person on.
 */
function useSweepingMutation<A>(fn: (args: A) => Promise<unknown>, ok: string) {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { ok },
    mutationFn: fn,
    onSuccess: () => void queryClient.invalidateQueries(),
  });
}

export function useLeaveClass() {
  return useSweepingMutation(
    async (classId: string) => unwrap(await supabase.rpc("leave_class", { p_class_id: classId })),
    "You left the class.",
  );
}

/** A co-teacher takes themselves off a class. */
export function useStopTeaching() {
  return useSweepingMutation(
    async (args: { classId: string; teacherId: string }) =>
      unwrap(
        await supabase.rpc("remove_co_teacher", {
          p_class_id: args.classId,
          p_teacher_id: args.teacherId,
        }),
      ),
    "You no longer teach that class.",
  );
}

export function useTransferClass() {
  return useSweepingMutation(
    async (args: { classId: string; email: string }) =>
      unwrap(
        await supabase.rpc("transfer_class", { p_class_id: args.classId, p_email: args.email }),
      ),
    "Handed over.",
  );
}

export function useDeleteClass() {
  return useSweepingMutation(
    async (classId: string) => unwrap(await supabase.rpc("delete_class", { p_class_id: classId })),
    "Class deleted.",
  );
}

export function useDeleteTest(classId: string) {
  return useClassMutation(
    classId,
    async (testId: string) => unwrap(await supabase.rpc("delete_test", { p_test_id: testId })),
    "Test deleted.",
  );
}

export function useDuplicateTest(classId: string) {
  return useClassMutation(
    classId,
    async (testId: string) => unwrap(await supabase.rpc("duplicate_test", { p_test_id: testId })),
    "Copy made. It is a draft.",
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

/** Several students at once; null keeps each one's own status or extra time (set_members). */
export function useSetMembers(classId: string) {
  return useClassMutation(
    classId,
    async (args: {
      studentIds: string[];
      status: MemberStatus | null;
      timeMultiplier: number | null;
    }) =>
      unwrap(
        await supabase.rpc("set_members", {
          p_class_id: classId,
          p_student_ids: args.studentIds,
          // The function keeps each student's own value for a null.
          p_status: args.status as MemberStatus,
          p_time_multiplier: args.timeMultiplier as number,
        }),
      ),
    "Saved.",
  );
}

export function useStudentReport(classId: string, studentId: string | null) {
  return useQuery({
    queryKey: ["class", classId, "student", studentId],
    enabled: studentId !== null,
    queryFn: async () =>
      unwrap(
        await supabase.rpc("class_student_report", {
          p_class_id: classId,
          p_student_id: studentId as string,
        }),
      ),
  });
}

export async function fetchClassMarks(classId: string) {
  return unwrap(await supabase.rpc("class_marks", { p_class_id: classId }));
}
