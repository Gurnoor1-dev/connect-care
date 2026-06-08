import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anon) {
  // eslint-disable-next-line no-console
  console.warn(
    "[BreatheRise] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. See migrate.md."
  );
}

export const supabase = createClient(url ?? "http://localhost", anon ?? "public-anon-key", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export type AppRole = "customer" | "specialist" | "admin";
