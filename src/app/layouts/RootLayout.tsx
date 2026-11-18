import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import {
  RiBookOpenLine,
  RiCameraLine,
  RiCloseLine,
  RiDashboard3Line,
  RiGroupLine,
  RiHome5Line,
  RiLogoutBoxRLine,
  RiMenuLine,
  RiQuestionLine,
  RiShieldUserLine,
  RiUserStarLine,
  type RemixiconComponentType,
} from "@remixicon/react";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../features/auth/session";
import { useProfile, type Profile } from "../../features/auth/useProfile";
import { isAdmin } from "../../features/auth/roles";
import { useView, type View } from "../../features/auth/view";
import { ViewSwitch } from "../../features/auth/ViewSwitch";
import { useJoinedClasses, useTeachingClasses } from "../../features/classes/api";
import { classBand } from "../../features/classes/colour";
import { cx } from "@/utils/cx";
import { buttonClass } from "../ui/buttonClass";
import { LoadingBar } from "../ui/LoadingBar";
import { Toaster } from "../ui/Toaster";

/**
 * Three shells: signed-in pages get a sidebar; the test and the phone page get a bare bar, so
 * nothing distracts from the test; everything else gets the public header and footer.
 */
export function RootLayout() {
  return (
    <>
      <LoadingBar />
      <Shell />
      <Toaster />
    </>
  );
}

function Shell() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/app/take/") || pathname.startsWith("/pair")) return <FocusShell />;
  if (pathname === "/app" || pathname.startsWith("/app/")) return <AppShell />;
  return <PublicShell />;
}

/** The wordmark: the grotesk and the red-orange dot, as HUMAN.md signs itself. */
function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cx(
        "font-display text-[1.375rem] leading-none font-extrabold tracking-[-0.03em] text-current no-underline",
        className,
      )}
    >
      Proctorise
      <span aria-hidden className="stage-dot" />
    </Link>
  );
}

function FooterLinks({ className }: { className?: string }) {
  return (
    <nav aria-label="Footer" className={cx("flex flex-wrap gap-x-5 gap-y-2", className)}>
      <Link to="/help/students" className="text-current no-underline hover:underline">
        For students
      </Link>
      <Link to="/help/teachers" className="text-current no-underline hover:underline">
        For teachers
      </Link>
      <Link to="/privacy" className="text-current no-underline hover:underline">
        Privacy
      </Link>
    </nav>
  );
}

/*
 * The public pages: the header sits on the paper, and each page below it opens on a set that
 * paints out to the window's edges (`bleed`), clipped here so the page never scrolls sideways.
 */
function PublicShell() {
  const state = useSession();
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-surface">
      <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur">
        <nav
          aria-label="Main"
          className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5"
        >
          <Logo className="text-text" />
          {state.status === "loading" ? null : state.session ? (
            <Link to="/app" className={buttonClass("primary")}>
              Open the app
            </Link>
          ) : (
            <div className="flex items-center gap-1">
              <Link
                to="/sign-in"
                className="pill text-body-medium text-text no-underline hover:bg-surface-muted"
              >
                Sign in
              </Link>
              {/* HUMAN.md's pink pill: the one way in. */}
              <Link
                to="/sign-up"
                className="pill bg-pink text-body-semibold text-ink no-underline hover:bg-[#f39abd] max-sm:hidden"
              >
                Create an account
              </Link>
            </div>
          )}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16">
        <Outlet />
      </main>
      <footer className="set-ink bleed on-wall print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-6 px-4 py-10">
          <div>
            <Logo />
            <p className="caption mt-3 on-wall-muted">online tests, checked fairly.</p>
          </div>
          <FooterLinks className="caption" />
        </div>
      </footer>
    </div>
  );
}

/* The test and the phone: one thin cobalt band and the paper. Nothing else to look at. */
function FocusShell() {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-surface">
      <header className="set-cobalt bg-cobalt on-wall print:hidden">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-2.5">
          <Logo className="text-[1.125rem]" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

/** A class's line carries its colour (`band`) where other lines carry an icon. */
type NavItem = { to: string; label: string; icon?: RemixiconComponentType; band?: string };
type NavClass = { id: string; name: string };

const MENU_CLASSES = 8;

/** One menu per role: the admin's, a teacher's or a student's. Classes are listed by name. */
function navFor(
  profile: Profile | undefined,
  view: View,
  classes: NavClass[],
): { title?: string; items: NavItem[] }[] {
  const data: NavItem = { to: "/app/my-data", label: "Your data", icon: RiShieldUserLine };
  if (isAdmin(profile)) {
    return [
      { items: [{ to: "/app", label: "Home", icon: RiHome5Line }] },
      {
        title: "Admin",
        items: [
          { to: "/app/admin/teachers", label: "Teachers", icon: RiUserStarLine },
          { to: "/app/admin/classes", label: "Classes", icon: RiGroupLine },
          { to: "/app/admin/usage", label: "Usage", icon: RiDashboard3Line },
        ],
      },
      { title: "You", items: [data] },
    ];
  }
  const home: NavItem = { to: "/app", label: "Classes", icon: RiGroupLine };
  const mine: NavItem[] = classes.slice(0, MENU_CLASSES).map((c) => ({
    to: `/app/classes/${c.id}`,
    label: c.name,
    band: classBand(c.id),
  }));
  if (view === "teacher") {
    return [
      { items: [home, ...mine] },
      { items: [{ to: "/app/bank", label: "Question bank", icon: RiBookOpenLine }] },
      {
        title: "You",
        items: [data, { to: "/help/teachers", label: "Help", icon: RiQuestionLine }],
      },
    ];
  }
  return [
    { items: [home, ...mine] },
    {
      title: "You",
      items: [
        { to: "/app/identity", label: "Your photo", icon: RiCameraLine },
        data,
        { to: "/help/students", label: "Help", icon: RiQuestionLine },
      ],
    },
  ];
}

function AppShell() {
  // The menu is open for one page; moving to another closes it.
  const { pathname } = useLocation();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  return (
    <div className="min-h-dvh bg-surface lg:flex">
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface-muted px-4 py-2.5 lg:hidden">
        <Logo className="text-text" />
        <button
          type="button"
          onClick={() => setOpenOn(open ? null : pathname)}
          aria-expanded={open}
          aria-controls="app-sidebar"
          className="grid size-9 place-items-center rounded-full text-text hover:bg-surface"
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
          "z-20 flex w-full flex-col border-border bg-surface-muted lg:w-60 lg:shrink-0 lg:border-r",
          open
            ? "max-lg:fixed max-lg:inset-x-0 max-lg:top-[57px] max-lg:bottom-0"
            : "max-lg:hidden",
        )}
      >
        {/* The desk runs the page's full height; only what is on it stays in view. */}
        <div className="flex min-h-0 flex-1 flex-col lg:sticky lg:top-0 lg:h-dvh lg:flex-none">
          <div className="hidden px-5 pt-6 pb-4 lg:block">
            <Logo className="text-text" />
          </div>
          <Sidebar />
        </div>
      </aside>
      {/* Each page opens on its stage, painted to the main column's edges and clipped there. */}
      <main className="min-w-0 flex-1 overflow-x-clip">
        <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-10">
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
  const view = useView(profile.data);
  const teaching = useTeachingClasses(view === "teacher" && !isAdmin(profile.data));
  const joined = useJoinedClasses();
  const classes =
    view === "teacher" ? (teaching.data ?? []).filter((c) => !c.archived_at) : (joined.data ?? []);
  const email = state.status === "ready" ? state.session?.user.email : undefined;
  const name = profile.data?.full_name || email || "";

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-3 pb-4">
      <ViewSwitch className="mx-1 mt-2" />
      <nav aria-label="Main" className="flex-1 space-y-5 pt-2">
        {navFor(profile.data, view, classes).map((group, i) => (
          <div key={group.title ?? i}>
            {group.title && <p className="caption px-3 pb-1 text-text-muted">{group.title}</p>}
            <ul className="space-y-px">
              {group.items.map(({ to, label, icon: Icon, band }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={to === "/app"}
                    className={({ isActive }) =>
                      cx(
                        "flex items-center gap-2.5 rounded-full px-3 py-1.5 text-body-medium no-underline",
                        isActive
                          ? "bg-ink text-[#fbf8f2] dark:bg-[#efe9de] dark:text-ink"
                          : "text-text-muted hover:bg-surface hover:text-text",
                      )
                    }
                  >
                    {Icon ? (
                      <Icon aria-hidden className="size-[18px] shrink-0" />
                    ) : (
                      <span
                        aria-hidden
                        className={cx("mx-[4px] size-2.5 shrink-0 rounded-full", band)}
                      />
                    )}
                    <span className="truncate">{label}</span>
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
            className="grid size-9 shrink-0 place-items-center rounded-full bg-pink font-display text-body-bold text-ink"
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
          className="mt-3 flex w-full items-center gap-2.5 rounded-full px-3 py-1.5 text-body-medium text-text-muted hover:bg-surface hover:text-text"
        >
          <RiLogoutBoxRLine aria-hidden className="size-[18px]" />
          Sign out
        </button>
      </div>
    </div>
  );
}
