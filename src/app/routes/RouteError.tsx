import { isRouteErrorResponse, Link, useRouteError } from "react-router";

export function RouteError() {
  const error = useRouteError();
  const detail = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : null;
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-text-muted">
        Reload the page to try again. If you were taking a test, your saved answers are safe.
      </p>
      {detail && <p className="mt-2 text-sm text-text-muted">{detail}</p>}
      <Link to="/" className="mt-4 inline-block text-accent underline">
        Go to the home page
      </Link>
    </main>
  );
}
