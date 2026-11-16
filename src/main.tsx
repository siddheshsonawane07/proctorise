import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router";
import { router } from "./app/router";
import { SessionProvider } from "./features/auth/SessionProvider";
import { followSystemColorScheme } from "./app/colorScheme";
import { toast } from "./app/ui/toast";
import { messageFrom } from "./lib/errors";
import "./app/theme.css";

followSystemColorScheme();

declare module "@tanstack/react-query" {
  interface Register {
    /** `ok`: what to say when it works. `quiet`: the page shows the failure itself. */
    mutationMeta: { ok?: string; quiet?: boolean };
  }
}

// Every action reports in the corner: a failure always, a success when the action names one.
const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, _args, _context, mutation) => {
      if (!mutation.meta?.quiet) toast.error(messageFrom(error));
    },
    onSuccess: (_data, _args, _context, mutation) => {
      if (mutation.meta?.ok) toast.ok(mutation.meta.ok);
    },
  }),
});

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element in index.html");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </QueryClientProvider>
  </StrictMode>,
);
