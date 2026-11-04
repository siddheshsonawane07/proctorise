import { Link } from "react-router";
import { Notice } from "../ui/Notice";

export function NotFound() {
  return (
    <Notice title="Page not found">
      That link doesn't go anywhere.{" "}
      <Link to="/" className="text-accent underline">
        Go to the home page
      </Link>
      .
    </Notice>
  );
}
