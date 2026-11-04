import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import type { Session } from "@supabase/supabase-js";
import { routes } from "./router";
import { DESKTOP_QUERY, PHONE_QUERY } from "../lib/useMediaQuery";
import { mediaMatches } from "../test/setup";
import { SessionContext } from "../features/auth/session";
import type { Profile } from "../features/auth/useProfile";

const USER_ID = "11111111-1111-1111-1111-111111111111";

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: USER_ID,
    full_name: "Asha Student",
    role: "student",
    teacher_status: "none",
    institution: null,
    teacher_note: null,
    teacher_requested_at: null,
    adult_confirmed_at: "2026-11-04T00:00:00Z",
    created_at: "2026-11-04T00:00:00Z",
    updated_at: "2026-11-04T00:00:00Z",
    ...overrides,
  };
}

/** Renders a path as a signed-out visitor, or as the given profile (never touching the network). */
function renderAt(path: string, as?: Profile) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  const session = as ? ({ user: { id: as.id, email: "a@example.test" } } as Session) : null;
  if (as) queryClient.setQueryData(["profile", as.id], as);
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={queryClient}>
      <SessionContext.Provider value={{ status: "ready", session }}>
        <RouterProvider router={router} />
      </SessionContext.Provider>
    </QueryClientProvider>,
  );
}

describe("public routes", () => {
  it("shows the landing page at /", async () => {
    renderAt("/");
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      "Online tests, checked fairly.",
    );
  });

  it("shows not found for an unknown path", async () => {
    renderAt("/nowhere/at/all");
    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  });
});

describe("signing in", () => {
  it("sends a signed-out visitor from the app to sign-in", async () => {
    renderAt("/app");
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });

  it("asks once for the 18+ statement when it is missing", async () => {
    renderAt("/app", profile({ adult_confirmed_at: null }));
    expect(
      await screen.findByRole("heading", { name: "One question before you start" }),
    ).toBeInTheDocument();
  });

  it("offers a student teacher access", async () => {
    renderAt("/app", profile());
    expect(await screen.findByRole("heading", { name: "Are you a teacher?" })).toBeInTheDocument();
  });

  it("tells a student whose request is open to wait", async () => {
    renderAt("/app", profile({ teacher_status: "requested" }));
    expect(await screen.findByText(/Your request is with the admin/)).toBeInTheDocument();
  });

  it("does not offer a teacher teacher access", async () => {
    renderAt("/app", profile({ role: "teacher", teacher_status: "approved" }));
    expect(await screen.findByText("Classes you teach will appear here.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Are you a teacher?" })).not.toBeInTheDocument();
  });

  it("keeps a student out of the admin page", async () => {
    renderAt("/app/admin/teachers", profile());
    expect(
      await screen.findByRole("heading", { name: "You don't have access" }),
    ).toBeInTheDocument();
  });
});

describe("the desktop-only gate", () => {
  it("blocks the test on a narrow screen", async () => {
    renderAt("/app/attempt/123", profile());
    expect(
      await screen.findByRole("heading", { name: "Please use a laptop or desktop" }),
    ).toBeInTheDocument();
  });

  it("opens the test on a desktop", async () => {
    mediaMatches.add(DESKTOP_QUERY);
    renderAt("/app/attempt/123", profile());
    expect(await screen.findByRole("heading", { name: "Test" })).toBeInTheDocument();
  });
});

describe("the phone-only gate", () => {
  it("opens the phone page on a phone, with no account", async () => {
    mediaMatches.add(PHONE_QUERY);
    renderAt("/pair/abc");
    expect(await screen.findByRole("heading", { name: "Phone camera" })).toBeInTheDocument();
  });

  it("asks a desktop to use a phone", async () => {
    mediaMatches.add(DESKTOP_QUERY);
    renderAt("/pair/abc");
    expect(
      await screen.findByRole("heading", { name: "Open this on your phone" }),
    ).toBeInTheDocument();
  });
});
