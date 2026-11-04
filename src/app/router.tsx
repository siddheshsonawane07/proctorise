import { createBrowserRouter, type RouteObject } from "react-router";
import { RootLayout } from "./layouts/RootLayout";
import { DesktopOnly } from "./layouts/DesktopOnly";
import { PhoneOnly } from "./layouts/PhoneOnly";
import { Landing } from "./routes/Landing";
import { AppHome } from "./routes/AppHome";
import { NotFound } from "./routes/NotFound";
import { RouteError } from "./routes/RouteError";
import { SignIn } from "../features/auth/SignIn";
import { SignUp } from "../features/auth/SignUp";
import { ForgotPassword } from "../features/auth/ForgotPassword";
import { ResetPassword } from "../features/auth/ResetPassword";
import { RequireAdmin, RequireAuth, RequireTeacher } from "../features/auth/RequireAuth";

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Landing /> },
      { path: "sign-in", element: <SignIn /> },
      { path: "sign-up", element: <SignUp /> },
      { path: "forgot-password", element: <ForgotPassword /> },
      { path: "reset-password", element: <ResetPassword /> },
      {
        path: "privacy",
        lazy: async () => ({ Component: (await import("./pages/Privacy")).Privacy }),
      },
      {
        path: "help/teachers",
        lazy: async () => ({ Component: (await import("./pages/Help")).HelpTeachers }),
      },
      {
        path: "help/students",
        lazy: async () => ({ Component: (await import("./pages/Help")).HelpStudents }),
      },
      {
        element: <RequireAuth />,
        children: [
          { path: "app", element: <AppHome /> },
          {
            path: "app/classes/:classId",
            lazy: async () => ({
              Component: (await import("../features/classes/ClassPage")).ClassPage,
            }),
          },
          {
            path: "app/my-data",
            lazy: async () => ({ Component: (await import("../features/account/MyData")).MyData }),
          },
          {
            path: "app/identity",
            lazy: async () => ({
              Component: (await import("../features/proctoring/Enrolment")).Enrolment,
            }),
          },
          {
            path: "app/results/:attemptId",
            lazy: async () => ({
              Component: (await import("../features/attempt/MyResult")).MyResult,
            }),
          },
          {
            element: <RequireTeacher />,
            children: [
              {
                path: "app/tests/:testId/live",
                lazy: async () => ({
                  Component: (await import("../features/monitor/LiveGrid")).LiveGrid,
                }),
              },
              {
                path: "app/tests/:testId/review",
                lazy: async () => ({
                  Component: (await import("../features/monitor/Review")).Review,
                }),
              },
              {
                path: "app/attempts/:attemptId/report",
                lazy: async () => ({
                  Component: (await import("../features/monitor/Report")).Report,
                }),
              },
              {
                path: "app/tests/:testId/results",
                lazy: async () => ({
                  Component: (await import("../features/results/Results")).Results,
                }),
              },
              {
                path: "app/bank",
                lazy: async () => ({ Component: (await import("../features/bank/Bank")).Bank }),
              },
              {
                path: "app/tests/:testId/edit",
                lazy: async () => ({
                  Component: (await import("../features/builder/Builder")).Builder,
                }),
              },
              {
                path: "app/tests/:testId/preview",
                lazy: async () => ({
                  Component: (await import("../features/builder/Preview")).Preview,
                }),
              },
            ],
          },
          {
            element: <RequireAdmin />,
            children: [
              {
                path: "app/admin/usage",
                lazy: async () => ({ Component: (await import("../features/admin/Usage")).Usage }),
              },
              {
                path: "app/admin/teachers",
                lazy: async () => ({
                  Component: (await import("../features/admin/Teachers")).Teachers,
                }),
              },
            ],
          },
          // The desktop-only gate covers the test itself, nothing else: teachers may read
          // results on a tablet, and the phone page must open on a phone.
          {
            element: <DesktopOnly />,
            children: [
              {
                path: "app/take/:testId",
                lazy: async () => ({
                  Component: (await import("../features/attempt/TakeTest")).TakeTest,
                }),
              },
            ],
          },
        ],
      },
      // The phone has no account of its own: it is paired by a one-time code (phase 6).
      {
        element: <PhoneOnly />,
        children: [
          {
            path: "pair/:token",
            lazy: async () => ({
              Component: (await import("../features/pairing/PhonePage")).PhonePage,
            }),
          },
          {
            path: "pair",
            lazy: async () => ({
              Component: (await import("../features/pairing/PhonePage")).PhonePage,
            }),
          },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
