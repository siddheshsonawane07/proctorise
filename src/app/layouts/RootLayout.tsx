import { Link, Outlet, useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../features/auth/session";
import { useProfile } from "../../features/auth/useProfile";

export function RootLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <nav
          aria-label="Main"
          className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3"
        >
          <Link to="/" className="text-lg font-semibold text-text no-underline">
            Proctorise
          </Link>
          <Account />
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

function Account() {
  const state = useSession();
  const profile = useProfile();
  const navigate = useNavigate();
  if (state.status === "loading") return null;
  if (!state.session) {
    return (
      <Link
        to="/sign-in"
        className="rounded-md px-3 py-1.5 text-sm font-medium text-accent hover:text-accent-hover"
      >
        Sign in
      </Link>
    );
  }
  async function signOut() {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  }
  return (
    <div className="flex items-center gap-4 text-sm">
      <Link to="/app" className="text-text">
        {profile.data?.full_name || state.session.user.email}
      </Link>
      <button type="button" onClick={signOut} className="font-medium text-accent">
        Sign out
      </button>
    </div>
  );
}
