import type { Profile } from "./useProfile";

/** Mirrors is_approved_teacher() in the database, for showing the right screens only. */
export function isTeacher(profile: Profile | undefined): boolean {
  if (!profile) return false;
  return (
    profile.role === "admin" ||
    (profile.role === "teacher" && profile.teacher_status === "approved")
  );
}
