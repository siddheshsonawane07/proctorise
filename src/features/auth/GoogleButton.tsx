import { supabase } from "../../lib/supabase";
import { messageFrom } from "../../lib/errors";
import { Button } from "../../app/ui/form";
import { toast } from "../../app/ui/toast";

/** Shown only where Google sign-in is configured (`VITE_AUTH_GOOGLE=on`). */
export function GoogleButton({ next }: { next: string }) {
  if (import.meta.env.VITE_AUTH_GOOGLE !== "on") return null;

  async function onClick() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${next}` },
    });
    if (error) toast.error(messageFrom(error));
  }

  return (
    <div className="mt-4 space-y-2">
      <Button variant="plain" className="w-full" onClick={onClick}>
        Continue with Google
      </Button>
    </div>
  );
}
