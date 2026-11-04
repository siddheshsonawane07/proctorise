import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { messageFrom } from "../../lib/errors";
import { Button, Message } from "../../app/ui/form";

/** Shown only where Google sign-in is configured (`VITE_AUTH_GOOGLE=on`). */
export function GoogleButton({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  if (import.meta.env.VITE_AUTH_GOOGLE !== "on") return null;

  async function onClick() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${next}` },
    });
    if (error) setError(messageFrom(error));
  }

  return (
    <div className="mt-4 space-y-2">
      <Button variant="plain" className="w-full" onClick={onClick}>
        Continue with Google
      </Button>
      {error && <Message kind="error">{error}</Message>}
    </div>
  );
}
