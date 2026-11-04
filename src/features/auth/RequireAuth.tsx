import { Navigate, Outlet, useLocation } from "react-router";
import { Loading } from "../../app/ui/form";
import { Notice } from "../../app/ui/Notice";
import { useSession } from "./session";
import { useProfile } from "./useProfile";
import { ConfirmAdult } from "./ConfirmAdult";

/** The signed-in part of the app. For the UI only: row-level security is the real guard. */
export function RequireAuth() {
  const state = useSession();
  const location = useLocation();
  const profile = useProfile();

  if (state.status === "loading") return <Loading />;
  if (!state.session) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/sign-in?next=${next}`} replace />;
  }
  if (profile.isPending) return <Loading />;
  if (profile.isError) {
    return (
      <Notice title="We couldn't load your account">
        Reload the page. If it keeps happening, sign out and sign in again.
      </Notice>
    );
  }
  if (!profile.data.adult_confirmed_at) return <ConfirmAdult />;
  return <Outlet />;
}

export function RequireAdmin() {
  const profile = useProfile();
  if (profile.data?.role !== "admin") {
    return <Notice title="You don't have access">This page is for the admin.</Notice>;
  }
  return <Outlet />;
}
