import { createBrowserRouter, type RouteObject } from "react-router";
import { RootLayout } from "./layouts/RootLayout";
import { DesktopOnly } from "./layouts/DesktopOnly";
import { PhoneOnly } from "./layouts/PhoneOnly";
import { Landing } from "./routes/Landing";
import { SignIn } from "./routes/SignIn";
import { AppHome } from "./routes/AppHome";
import { NotFound } from "./routes/NotFound";
import { RouteError } from "./routes/RouteError";

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Landing /> },
      { path: "sign-in", element: <SignIn /> },
      { path: "app", element: <AppHome /> },
      // The desktop-only gate covers the test itself, nothing else: teachers may read results
      // on a tablet, and the phone page must open on a phone.
      {
        element: <DesktopOnly />,
        children: [
          {
            path: "app/attempt/:attemptId",
            lazy: async () => ({ Component: (await import("./routes/Attempt")).Attempt }),
          },
        ],
      },
      {
        element: <PhoneOnly />,
        children: [
          {
            path: "pair/:token",
            lazy: async () => ({ Component: (await import("./routes/Pair")).Pair }),
          },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
