import type { Profile } from "./useProfile";

/** Mirrors is_approved_teacher() in the database, for showing the right screens only. */
export function isTeacher(profile: Profile | undefined): boolean {
  return profile?.role === "teacher" && profile.teacher_status === "approved";
}

/** The admin only administers: no classes to teach or to join (ADR 012). */
export function isAdmin(profile: Profile | undefined): boolean {
  return profile?.role === "admin";
}
