import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const resetRequested =
      params.get("reset") === "1" ||
      new URLSearchParams(window.location.hash.replace(/^#/, "")).get("type") === "recovery";

    const goToReset = () => navigate("/reset-password", { replace: true });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        goToReset();
        return;
      }

      if (resetRequested && session) {
        goToReset();
        return;
      }

      if (event === "SIGNED_IN" && session) {
        const redirect = params.get("redirect") || "/dashboard";
        navigate(redirect, { replace: true });
      } else if (event === "INITIAL_SESSION" && !session && !resetRequested) {
        const redirect = params.get("redirect") || "/login";
        navigate(redirect, { replace: true });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (resetRequested && session) {
        goToReset();
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
