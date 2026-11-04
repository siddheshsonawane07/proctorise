import { Link, Outlet } from "react-router";

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
          <Link
            to="/sign-in"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-accent hover:text-accent-hover"
          >
            Sign in
          </Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
