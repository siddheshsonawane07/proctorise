import { Link } from "react-router";
import { BecomeTeacher } from "../../features/account/BecomeTeacher";
import { useProfile } from "../../features/auth/useProfile";
import { Card } from "../ui/form";

export function AppHome() {
  const { data: profile } = useProfile();
  if (!profile) return null; // RequireAuth renders this only once the profile has loaded.

  const firstName = profile.full_name.split(" ")[0] || "there";
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Hello, {firstName}</h1>
      {profile.role === "admin" && (
        <Card title="Admin">
          <Link to="/app/admin/teachers" className="text-accent underline">
            Teacher requests and teachers
          </Link>
        </Card>
      )}
      <Card title="Your classes">
        <p className="text-text-muted">
          {profile.role === "student"
            ? "Classes you join will appear here."
            : "Classes you teach will appear here."}
        </p>
      </Card>
      {profile.role === "student" && <BecomeTeacher profile={profile} />}
    </div>
  );
}
