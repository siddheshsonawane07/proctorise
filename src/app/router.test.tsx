import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "./router";
import { DESKTOP_QUERY, PHONE_QUERY } from "../lib/useMediaQuery";
import { mediaMatches } from "../test/setup";

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
}

describe("routes", () => {
  it("shows the landing page at /", async () => {
    renderAt("/");
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      "Online tests, checked fairly.",
    );
  });

  it("shows not found for an unknown path", async () => {
    renderAt("/app/nowhere/at/all");
    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  });

  it("works at any width outside the test routes", async () => {
    renderAt("/app");
    expect(await screen.findByRole("heading", { name: "Your classes" })).toBeInTheDocument();
  });
});

describe("the desktop-only gate", () => {
  it("blocks the test on a narrow screen", async () => {
    renderAt("/app/attempt/123");
    expect(
      await screen.findByRole("heading", { name: "Please use a laptop or desktop" }),
    ).toBeInTheDocument();
  });

  it("opens the test on a desktop", async () => {
    mediaMatches.add(DESKTOP_QUERY);
    renderAt("/app/attempt/123");
    expect(await screen.findByRole("heading", { name: "Test" })).toBeInTheDocument();
  });
});

describe("the phone-only gate", () => {
  it("opens the phone page on a phone, even a narrow one", async () => {
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
