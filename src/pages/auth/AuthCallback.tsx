import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    // Rely on the auth state change listener to avoid race conditions
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        const redirect = params.get("redirect") || "/dashboard";
        navigate(redirect, { replace: true });
      } else if (event === "INITIAL_SESSION" && !session) {
        // Fallback if there is no session detected after initialization
        const redirect = params.get("redirect") || "/login";
        navigate(redirect, { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, params]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-page">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
