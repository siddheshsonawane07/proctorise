/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  /** "on" where Google sign-in is configured on the Supabase project. */
  readonly VITE_AUTH_GOOGLE?: string;
}
