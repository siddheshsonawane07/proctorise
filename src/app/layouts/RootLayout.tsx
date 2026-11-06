import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import {
  RiBookOpenLine,
  RiCameraLine,
  RiCloseLine,
  RiDashboard3Line,
  RiHome5Line,
  RiLogoutBoxRLine,
  RiMenuLine,
  RiQuestionLine,
  RiShieldCheckLine,
  RiShieldUserLine,
  RiUserStarLine,
  type RemixiconComponentType,
} from "@remixicon/react";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../features/auth/session";
import { useProfile, type Profile } from "../../features/auth/useProfile";
import { isTeacher } from "../../features/auth/roles";
import { cx } from "@/utils/cx";
import { buttonClass } from "../ui/buttonClass";

/**
 * Three shells: signed-in pages get a sidebar; the test and the phone page get a bare bar, so
 * nothing distracts from the test; everything else gets the public header and footer.
 */
export function RootLayout() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/app/take/") || pathname.startsWith("/pair")) return <FocusShell />;
  if (pathname === "/app" || pathname.startsWith("/app/")) return <AppShell />;
  return <PublicShell />;
}

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 text-text no-underline">
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-lg bg-accent text-accent-text"
      >
        <RiShieldCheckLine className="size-5" />
      </span>
      <span className="text-headline-semibold">Proctorise</span>
    </Link>
  );
}

function FooterLinks({ className }: { className?: string }) {
  return (
    <nav aria-label="Footer" className={cx("flex flex-wrap gap-x-5 gap-y-2", className)}>
      <Link to="/help/students" className="text-text-muted hover:text-text">
        For students
      </Link>
      <Link to="/help/teachers" className="text-text-muted hover:text-text">
        For teachers
      </Link>
      <Link to="/privacy" className="text-text-muted hover:text-text">
        Privacy
      </Link>
    </nav>
  );
}

function PublicShell() {
  const state = useSession();
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-surface/90 backdrop-blur">
        <nav
          aria-label="Main"
          className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3"
        >
          <Logo />
          {state.status === "loading" ? null : state.session ? (
            <Link to="/app" className={buttonClass("primary")}>
              Open the app
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/sign-in" className={buttonClass("plain")}>
                Sign in
              </Link>
              <Link to="/sign-up" className={cx(buttonClass("primary"), "max-sm:hidden")}>
                Create an account
              </Link>
            </div>
          )}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <Outlet />
      </main>
      <footer className="border-t border-border print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-caption-1-regular">
          <span className="text-text-muted">Proctorise. Online tests, checked fairly.</span>
          <FooterLinks />
        </div>
      </footer>
    </div>
  );
}

function FocusShell() {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="border-b border-border print:hidden">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-2.5">
          <Logo />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

type NavItem = { to: string; label: string; icon: RemixiconComponentType };

function navFor(profile: Profile | undefined): { title?: string; items: NavItem[] }[] {
  const groups: { title?: string; items: NavItem[] }[] = [
    { items: [{ to: "/app", label: "Home", icon: RiHome5Line }] },
  ];
  if (isTeacher(profile)) {
    groups[0]!.items.push({ to: "/app/bank", label: "Question bank", icon: RiBookOpenLine });
  }
  if (profile?.role === "admin") {
    groups.push({
      title: "Admin",
      items: [
        { to: "/app/admin/teachers", label: "Teachers", icon: RiUserStarLine },
        { to: "/app/admin/usage", label: "Usage", icon: RiDashboard3Line },
      ],
    });
  }
  groups.push({
    title: "You",
    items: [
      { to: "/app/identity", label: "Your photo", icon: RiCameraLine },
      { to: "/app/my-data", label: "Your data", icon: RiShieldUserLine },
      {
        to: isTeacher(profile) ? "/help/teachers" : "/help/students",
        label: "Help",
        icon: RiQuestionLine,
      },
    ],
  });
  return groups;
}

function AppShell() {
  // The menu is open for one page; moving to another closes it.
  const { pathname } = useLocation();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  return (
    <div className="min-h-dvh bg-surface-muted lg:flex">
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface px-4 py-2.5 lg:hidden">
        <Logo />
        <button
          type="button"
          onClick={() => setOpenOn(open ? null : pathname)}
          aria-expanded={open}
          aria-controls="app-sidebar"
          className="grid size-9 place-items-center rounded-lg text-text hover:bg-surface-muted"
        >
          {open ? (
            <RiCloseLine aria-hidden className="size-5" />
          ) : (
            <RiMenuLine aria-hidden className="size-5" />
          )}
          <span className="sr-only">{open ? "Close the menu" : "Open the menu"}</span>
        </button>
      </div>
      <aside
        id="app-sidebar"
        className={cx(
          "z-20 flex w-full flex-col border-border bg-surface lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:shrink-0 lg:border-r",
          open
            ? "max-lg:fixed max-lg:inset-x-0 max-lg:top-[57px] max-lg:bottom-0"
            : "max-lg:hidden",
        )}
      >
        <div className="hidden px-5 py-4 lg:block">
          <Logo />
        </div>
        <Sidebar />
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-10">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function Sidebar() {
  const state = useSession();
  const profile = useProfile();
  const navigate = useNavigate();
  async function signOut() {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  }
  const email = state.status === "ready" ? state.session?.user.email : undefined;
  const name = profile.data?.full_name || email || "";

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-3 pb-4">
      <nav aria-label="Main" className="flex-1 space-y-5 pt-2">
        {navFor(profile.data).map((group, i) => (
          <div key={group.title ?? i}>
            {group.title && (
              <p className="px-3 pb-1.5 text-caption-1-semibold tracking-wide text-text-muted uppercase">
                {group.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={to === "/app"}
                    className={({ isActive }) =>
                      cx(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-body-medium no-underline transition-colors",
                        isActive
                          ? "bg-accent/10 text-accent"
                          : "text-text hover:bg-surface-muted hover:text-text",
                      )
                    }
                  >
                    <Icon aria-hidden className="size-[18px] shrink-0" />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="mt-4 border-t border-border pt-4">
        <div className="flex items-center gap-3 px-2">
          <span
            aria-hidden
            className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/10 text-body-semibold text-accent"
          >
            {(name[0] ?? "?").toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-medium text-text">{profile.data?.full_name}</p>
            <p className="truncate text-caption-1-regular text-text-muted">{email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="mt-3 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-body-medium text-text hover:bg-surface-muted"
        >
          <RiLogoutBoxRLine aria-hidden className="size-[18px]" />
          Sign out
        </button>
      </div>
    </div>
  );
}
