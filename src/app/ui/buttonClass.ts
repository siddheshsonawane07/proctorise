import { buttonStyles } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";

/** Classes that make a router <Link> look like a button. */
export function buttonClass(variant: "primary" | "plain" = "primary", className?: string) {
  return cx(
    buttonStyles.base,
    buttonStyles.size.medium,
    buttonStyles.variant[variant === "primary" ? "primary" : "secondary"],
    "px-3 no-underline",
    className,
  );
}
